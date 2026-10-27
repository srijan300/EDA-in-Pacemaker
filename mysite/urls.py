from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from accounts import views as account_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('patients/', include('patients.urls')),
    path('api/', include('patients.api_urls')),
    path('captcha/', include('captcha.urls')),
    # Landing: always show the signup page first. The dashboard now lives
    # at /dashboard/. Logged-in doctors visiting signup are bounced to it.
    path('', RedirectView.as_view(pattern_name='signup'), name='root'),
    path('dashboard/', account_views.home_view, name='home'),
]
