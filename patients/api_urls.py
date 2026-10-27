from django.urls import path

from . import api

urlpatterns = [
    # Auth
    path("auth/request-password", api.request_password, name="api_request_password"),
    path("auth/setup/<str:token>", api.setup_link, name="api_setup_link"),
    path("auth/login", api.login, name="api_login"),
    path("auth/change-password", api.change_password, name="api_change_password"),
    path("me", api.me, name="api_me"),
    # Device sync
    path("pacemaker/voltage", api.get_voltage, name="api_get_voltage"),
    path("pacemaker/voltage/ack", api.ack_voltage, name="api_ack_voltage"),
    path("heartrate", api.upload_heartrate, name="api_upload_heartrate"),
    path("heartrate/history", api.list_heartrate, name="api_list_heartrate"),
]
