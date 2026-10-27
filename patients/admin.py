from django.contrib import admin

from .models import HeartRateRecord, Patient, VoltageChange


class VoltageChangeInline(admin.TabularInline):
    model = VoltageChange
    extra = 0
    readonly_fields = ("previous_voltage", "new_voltage", "pushed", "created_at", "pushed_at")
    can_delete = False


class HeartRateRecordInline(admin.TabularInline):
    model = HeartRateRecord
    extra = 0
    readonly_fields = ("bpm", "voltage_at_reading", "recorded_at", "pulled_at")
    can_delete = False


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "patient_id",
        "full_name",
        "doctor",
        "blood_type",
        "current_voltage",
        "target_voltage",
        "last_pushed_at",
        "last_pulled_at",
    )
    list_filter = ("blood_type", "doctor")
    search_fields = ("patient_id", "full_name", "email", "phone")
    inlines = [VoltageChangeInline, HeartRateRecordInline]


@admin.register(VoltageChange)
class VoltageChangeAdmin(admin.ModelAdmin):
    list_display = ("patient", "previous_voltage", "new_voltage", "pushed", "created_at", "pushed_at")
    list_filter = ("pushed",)


@admin.register(HeartRateRecord)
class HeartRateRecordAdmin(admin.ModelAdmin):
    list_display = ("patient", "bpm", "voltage_at_reading", "recorded_at")
    list_filter = ("patient",)


from .models import ApiToken, PasswordSetupLink


@admin.register(ApiToken)
class ApiTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "key", "created_at", "last_used_at")
    search_fields = ("user__username", "user__email", "key")


@admin.register(PasswordSetupLink)
class PasswordSetupLinkAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "created_at", "used_at")
    search_fields = ("user__username", "user__email")
