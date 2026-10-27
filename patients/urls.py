from django.urls import path

from . import views

urlpatterns = [
    path("", views.patient_list, name="patient_list"),
    path("add/", views.add_patient, name="add_patient"),
    path("sync-all/", views.sync_all, name="sync_all"),
    path("<int:pk>/", views.patient_detail, name="patient_detail"),
    path("<int:pk>/delete/", views.delete_patient, name="delete_patient"),
    path("<int:pk>/set-voltage/", views.set_voltage, name="set_voltage"),
    path("<int:pk>/push/", views.push_now, name="push_now"),
    path("<int:pk>/pull/", views.pull_now, name="pull_now"),
    path("<int:pk>/sync/", views.sync_now, name="sync_now"),
]
