import uuid
from django.db import models
from apps.hierarchy.models import Facility


class AlertRule(models.Model):

    class Severity(models.TextChoices):
        LOW      = 'LOW',      'Low'
        MEDIUM   = 'MEDIUM',   'Medium'
        HIGH     = 'HIGH',     'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class AnomalyType(models.TextChoices):
        TRAFFIC_SPIKE  = 'TRAFFIC_SPIKE',  'Traffic Spike'
        TRAFFIC_DROP   = 'TRAFFIC_DROP',   'Traffic Drop'
        DEVICE_FLAPPING = 'DEVICE_FLAPPING', 'Device Flapping'
        ERROR_RATE     = 'ERROR_RATE',     'Error Rate'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255, help_text="Human-readable rule name")

    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='alert_rules',
        help_text="Leave blank to apply to all facilities"
    )

    # Minimum severity that triggers this rule
    min_severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.HIGH,
    )

    # Optional — null means any anomaly type triggers the rule
    anomaly_type = models.CharField(
        max_length=30,
        choices=AnomalyType.choices,
        null=True, blank=True,
        help_text="Leave blank to match any anomaly type"
    )

    # How long (minutes) to wait before this rule can fire again
    cooldown_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Minimum minutes between repeated alerts for this rule"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class AlertRecipient(models.Model):

    class Channel(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        SLACK = 'SLACK', 'Slack'  # future

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    rule = models.ForeignKey(
        AlertRule,
        on_delete=models.CASCADE,
        related_name='recipients',
    )

    name  = models.CharField(max_length=255, help_text="Recipient's display name")
    email = models.EmailField(help_text="Where to send the alert")
    webhook_url = models.URLField(
    blank=True,
    help_text="Slack incoming webhook URL (required if channel is SLACK)"
    )

    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.EMAIL,
    )

    is_active = models.BooleanField(default=True)
    receive_digest = models.BooleanField(
    default=False,
    help_text="If checked, this recipient receives the daily digest email"
)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} <{self.email}> → {self.rule.name}"



class AlertLog(models.Model):

    class Status(models.TextChoices):
        SENT   = 'SENT',   'Sent'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    rule = models.ForeignKey(
        AlertRule,
        on_delete=models.CASCADE,
        related_name='logs',
    )

    recipient = models.ForeignKey(
        AlertRecipient,
        on_delete=models.CASCADE,
        related_name='logs',
    )

    # The anomaly that triggered this alert
    anomaly = models.ForeignKey(
        'ml.Anomaly',
        on_delete=models.SET_NULL,
        null=True,
        related_name='alert_logs',
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SENT,
    )

    # Store the error message if sending failed
    error_message = models.TextField(blank=True)

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.rule.name} → {self.recipient.email} [{self.status}]"