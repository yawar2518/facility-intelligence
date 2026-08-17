from rest_framework import serializers
from .models import AlertRule, AlertRecipient, AlertLog


class AlertRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRecipient
        fields = ['id', 'name', 'email', 'channel']


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = ['id', 'name', 'min_severity', 'anomaly_type', 'facility']


class AlertLogSerializer(serializers.ModelSerializer):
    rule      = AlertRuleSerializer(read_only=True)
    recipient = AlertRecipientSerializer(read_only=True)

    class Meta:
        model = AlertLog
        fields = [
            'id', 'rule', 'recipient', 'anomaly',
            'status', 'error_message', 'sent_at',
        ]

class AlertLogCSVSerializer(serializers.ModelSerializer):
    rule_name      = serializers.CharField(source='rule.name', read_only=True)
    rule_severity  = serializers.CharField(source='rule.min_severity', read_only=True)
    anomaly_type   = serializers.CharField(source='rule.anomaly_type', read_only=True)
    recipient_name  = serializers.CharField(source='recipient.name', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    channel        = serializers.CharField(source='recipient.channel', read_only=True)

    class Meta:
        model  = AlertLog
        fields = [
            'id', 'rule_name', 'rule_severity', 'anomaly_type',
            'recipient_name', 'recipient_email', 'channel',
            'status', 'error_message', 'sent_at',
        ]