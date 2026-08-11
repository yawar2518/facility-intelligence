import uuid
from django.db import models
from apps.hierarchy.models import Facility, Lane


class Anomaly(models.Model):

    class AnomalyType(models.TextChoices):
        TRAFFIC_SPIKE   = 'TRAFFIC_SPIKE',   'Traffic Spike'
        TRAFFIC_DROP    = 'TRAFFIC_DROP',    'Traffic Drop'
        DEVICE_FLAPPING = 'DEVICE_FLAPPING', 'Device Flapping'
        ERROR_RATE      = 'ERROR_RATE',      'Abnormal Error Rate'

    class Severity(models.TextChoices):
        LOW      = 'LOW',      'Low'
        MEDIUM   = 'MEDIUM',   'Medium'
        HIGH     = 'HIGH',     'High'
        CRITICAL = 'CRITICAL', 'Critical'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Where did this happen?
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name='anomalies'
    )
    lane = models.ForeignKey(
        Lane, on_delete=models.CASCADE, related_name='anomalies',
        null=True, blank=True  # device-level anomalies may not have a lane
    )

    # What type and how bad?
    anomaly_type = models.CharField(max_length=30, choices=AnomalyType.choices)
    severity     = models.CharField(max_length=10, choices=Severity.choices)

    # The numbers — stored for explainability
    observed_value  = models.FloatField()   # actual event count this hour
    baseline_value  = models.FloatField()   # expected count from baseline
    std_dev         = models.FloatField()   # standard deviation of baseline
    sigma_score     = models.FloatField()   # how many σ away observed is

    # Human-readable explanation
    explanation = models.TextField()

    # Timestamps
    detected_at = models.DateTimeField(auto_now_add=True)
    window_start = models.DateTimeField()  # the hour this anomaly covers
    window_end   = models.DateTimeField()

    # Operator workflow
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['facility', 'detected_at']),
            models.Index(fields=['lane', 'detected_at']),
            models.Index(fields=['is_acknowledged', 'detected_at']),
        ]

    def __str__(self):
        return f"{self.anomaly_type} @ {self.lane} — {self.sigma_score:.1f}σ"