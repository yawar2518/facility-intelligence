from django.contrib import admin
from .models import AlertRule, AlertRecipient, AlertLog


class AlertRecipientInline(admin.TabularInline):
    model = AlertRecipient
    extra = 1
    fields = ['name', 'email', 'channel', 'webhook_url', 'receive_digest', 'is_active']


class AlertLogInline(admin.TabularInline):
    """Last 10 delivery records shown inside the rule's admin page."""
    model = AlertLog
    extra = 0
    readonly_fields = ['recipient', 'anomaly', 'status', 'error_message', 'sent_at']
    can_delete = False
    max_num = 10
    ordering = ['-sent_at']


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'facility', 'min_severity', 'anomaly_type',
                    'cooldown_minutes', 'is_active']
    list_filter  = ['is_active', 'min_severity', 'facility']
    search_fields = ['name']
    inlines = [AlertRecipientInline, AlertLogInline]


@admin.register(AlertLog)
class AlertLogAdmin(admin.ModelAdmin):
    list_display  = ['rule', 'recipient', 'anomaly', 'status', 'sent_at']
    list_filter   = ['status', 'rule']
    readonly_fields = ['rule', 'recipient', 'anomaly', 'status',
                       'error_message', 'sent_at']
    ordering = ['-sent_at']