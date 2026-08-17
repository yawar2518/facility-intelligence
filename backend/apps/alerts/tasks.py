import logging
import requests
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import AlertRule, AlertLog
from apps.ml.models import Anomaly

logger = logging.getLogger(__name__)


@shared_task(name='evaluate_alert_rules')
def evaluate_alert_rules():
    """
    Runs after every anomaly detection cycle (:15 past each hour).
    Checks each active AlertRule against recent anomalies,
    applies cooldown logic, and queues emails for matching rules.
    """
    now = timezone.now()
    lookback_start = now - timedelta(minutes=70)

    active_rules = AlertRule.objects.filter(is_active=True).prefetch_related('recipients')
    logger.info(f"[alerts] Evaluating {active_rules.count()} active rules")

    for rule in active_rules:
        # --- Step 1: Find matching anomalies ---
        anomalies = Anomaly.objects.filter(
            window_start__gte=lookback_start,
        )

        if rule.facility:
            anomalies = anomalies.filter(facility=rule.facility)

        if rule.anomaly_type:
            anomalies = anomalies.filter(anomaly_type=rule.anomaly_type)

        severity_order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        min_index = severity_order.index(rule.min_severity)
        allowed_severities = severity_order[min_index:]
        anomalies = anomalies.filter(severity__in=allowed_severities)

        if not anomalies.exists():
            continue

        # --- Step 2: Check cooldown ---
        last_log = AlertLog.objects.filter(
            rule=rule,
            status=AlertLog.Status.SENT,
        ).order_by('-sent_at').first()

        if last_log:
            cooldown_expires = last_log.sent_at + timedelta(minutes=rule.cooldown_minutes)
            if now < cooldown_expires:
                logger.info(f"[alerts] Rule '{rule.name}' in cooldown until {cooldown_expires}")
                continue

        # --- Step 3: Take the most severe anomaly ---
        trigger_anomaly = anomalies.order_by('-severity', '-sigma_score').first()

        # --- Step 4: Notify each active recipient ---
        recipients = rule.recipients.filter(is_active=True)
        if not recipients.exists():
            logger.warning(f"[alerts] Rule '{rule.name}' matched but has no active recipients")
            continue

        for recipient in recipients:
            send_alert_email.delay(
                rule_id=str(rule.id),
                recipient_id=str(recipient.id),
                anomaly_id=str(trigger_anomaly.id),
            )

    logger.info("[alerts] Rule evaluation complete")


@shared_task(name='send_alert_email')
def send_alert_email(rule_id: str, recipient_id: str, anomaly_id: str):
    """
    Sends one alert to one recipient via EMAIL or SLACK.
    Writes an AlertLog entry regardless of success or failure.
    """
    from .models import AlertRecipient

    try:
        rule      = AlertRule.objects.get(id=rule_id)
        recipient = AlertRecipient.objects.get(id=recipient_id)
        anomaly   = Anomaly.objects.get(id=anomaly_id)
    except Exception as e:
        logger.error(f"[alerts] Could not load objects for alert task: {e}")
        return

    try:
        subject = f"[Argus Alert] {rule.name} — {anomaly.severity} anomaly detected"

        body = (
            f"Alert Rule  : {rule.name}\n"
            f"Severity    : {anomaly.severity}\n"
            f"Type        : {anomaly.anomaly_type}\n"
            f"Facility    : {anomaly.facility}\n"
            f"Explanation : {anomaly.explanation}\n"
            f"Detected at : {anomaly.window_start.strftime('%Y-%m-%d %H:%M UTC')}\n"
            f"Sigma score : {anomaly.sigma_score:.2f}\n"
        )

        if recipient.channel == 'EMAIL':
            logger.info(f"[alerts] Sending email → {recipient.email}")
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=False,
            )

        elif recipient.channel == 'SLACK':
            if not recipient.webhook_url:
                raise ValueError(f"Recipient {recipient.name} has no webhook_url set")

            logger.info(f"[alerts] Sending Slack message → {recipient.name}")
            slack_payload = {
                "text": f"*{subject}*",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"🚨 {rule.name}",
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Severity:*\n{anomaly.severity}"},
                            {"type": "mrkdwn", "text": f"*Type:*\n{anomaly.anomaly_type}"},
                            {"type": "mrkdwn", "text": f"*Facility:*\n{anomaly.facility}"},
                            {"type": "mrkdwn", "text": f"*Sigma Score:*\n{anomaly.sigma_score:.2f}σ"},
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Explanation:*\n{anomaly.explanation}"
                        }
                    },
                ]
            }
            response = requests.post(recipient.webhook_url, json=slack_payload)
            response.raise_for_status()

        # Write success log
        AlertLog.objects.create(
            rule=rule,
            recipient=recipient,
            anomaly=anomaly,
            status=AlertLog.Status.SENT,
        )
        logger.info(f"[alerts] Log written — rule '{rule.name}' → {recipient.name}")

    except Exception as e:
        AlertLog.objects.create(
            rule=rule,
            recipient=recipient,
            anomaly=anomaly,
            status=AlertLog.Status.FAILED,
            error_message=str(e),
        )
        logger.error(f"[alerts] Failed to send alert to {recipient.name}: {e}")


@shared_task(name='send_daily_digest')
def send_daily_digest():
    """
    Sends a daily summary email to all recipients with receive_digest=True.
    Scheduled to run every day at 8:00 AM UTC.
    """
    from .models import AlertRecipient
    from apps.monitoring.models import Device
    from apps.hierarchy.models import Facility

    now = timezone.now()
    since = now - timedelta(hours=24)

    # --- Anomaly summary ---
    anomalies_24h = Anomaly.objects.filter(detected_at__gte=since)
    total = anomalies_24h.count()

    severity_breakdown = {}
    for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
        count = anomalies_24h.filter(severity=sev).count()
        if count:
            severity_breakdown[sev] = count

    # --- Top affected facilities ---
    facility_counts = {}
    for anomaly in anomalies_24h.select_related('facility'):
        name = str(anomaly.facility)
        facility_counts[name] = facility_counts.get(name, 0) + 1
    top_facilities = sorted(facility_counts.items(), key=lambda x: x[1], reverse=True)[:3]

    # --- Device uptime summary ---
    from apps.hierarchy.models import Device as HierarchyDevice
    total_devices  = HierarchyDevice.objects.filter(is_active=True).count()
    online_devices = HierarchyDevice.objects.filter(
        is_active=True, status='ONLINE'
    ).count()
    uptime_pct = (online_devices / total_devices * 100) if total_devices else 0

    # --- Build digest body ---
    breakdown_lines = '\n'.join(
        f"  {sev}: {count}" for sev, count in severity_breakdown.items()
    ) or '  None'

    facility_lines = '\n'.join(
        f"  {name}: {count} anomalies" for name, count in top_facilities
    ) or '  None'

    body = (
        f"Argus Daily Digest — {now.strftime('%Y-%m-%d')}\n"
        f"{'=' * 40}\n\n"
        f"ANOMALIES (last 24 hours)\n"
        f"  Total     : {total}\n"
        f"{breakdown_lines}\n\n"
        f"TOP AFFECTED FACILITIES\n"
        f"{facility_lines}\n\n"
        f"DEVICE HEALTH\n"
        f"  Online    : {online_devices} / {total_devices} ({uptime_pct:.1f}%)\n\n"
        f"— Argus Facility Intelligence Platform"
    )

    subject = f"[Argus Digest] Daily Summary — {now.strftime('%Y-%m-%d')}"

    # --- Send to all digest recipients ---
    digest_recipients = AlertRecipient.objects.filter(
        receive_digest=True,
        is_active=True,
        channel='EMAIL',
    )

    if not digest_recipients.exists():
        logger.info("[digest] No digest recipients configured")
        return

    for recipient in digest_recipients:
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=False,
            )
            logger.info(f"[digest] Sent to {recipient.email}")
        except Exception as e:
            logger.error(f"[digest] Failed to send to {recipient.email}: {e}")