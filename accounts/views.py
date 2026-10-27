from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib import messages

from .forms import SignUpForm, LoginForm


def _send_verification_email(request, user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    activation_link = request.build_absolute_uri(f"/accounts/activate/{uid}/{token}/")
    subject = "Verify your email address"
    message = render_to_string("accounts/activation_email.txt", {
        "user": user,
        "activation_link": activation_link,
    })
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


def signup_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            _send_verification_email(request, user)
            return render(request, "accounts/activation_sent.html", {"email": user.email})
    else:
        form = SignUpForm()

    return render(request, "accounts/signup.html", {"form": form})


def activate_view(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        messages.success(request, "Your email has been verified. You can log in now.")
        return redirect("login")

    return render(request, "accounts/activation_invalid.html")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("home")
        else:
            username = request.POST.get("username")
            if username and not form.get_user():
                try:
                    existing = User.objects.get(username=username)
                    if not existing.is_active:
                        messages.error(
                            request,
                            "Please verify your email before logging in. "
                            "Check your inbox for the verification link."
                        )
                except User.DoesNotExist:
                    pass
    else:
        form = LoginForm()

    return render(request, "accounts/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("login")


def auto_generate_password_view(request):
    from django.urls import reverse
    import secrets
    import string

    if request.method == "POST":
        from .forms import AutoGeneratePasswordForm
        form = AutoGeneratePasswordForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data["email"].strip().lower()
            # Try to find a user with this email
            user = User.objects.filter(email__iexact=email).first()
            if user:
                # Generate a random password
                alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
                password = "".join(secrets.choice(alphabet) for i in range(12))
                user.set_password(password)
                user.save()

                # Send email
                login_url = request.build_absolute_uri(reverse('login'))
                subject = "Your Auto-Generated Password"
                message = (
                    f"Hello,\n\n"
                    f"Your account password has been auto-generated.\n"
                    f"Your new password is: {password}\n\n"
                    f"Please log in using your email as the username and the password above: {login_url}\n\n"
                    f"You can change this password after logging in."
                )
                try:
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
                    messages.success(request, f"Success! An auto-generated password has been sent to {email}.")
                except Exception as e:
                    messages.error(request, f"Error sending email: {e}")
                
            else:
                messages.error(
                    request, 
                    f"No patient account found for {email}. Please make sure the doctor has registered a patient with this exact email."
                )
            return redirect("login")
    else:
        from .forms import AutoGeneratePasswordForm
        form = AutoGeneratePasswordForm()

    return render(request, "accounts/auto_generate_password.html", {"form": form})


@login_required(login_url="signup")
def home_view(request):
    """Dashboard: at-a-glance stats across the doctor's patients.

    Anonymous visitors to the site root are sent to the signup page first
    (per the desired landing flow), not the login page.
    """
    from django.db.models import Count, Q
    from patients.models import HeartRateRecord, Patient

    patients = list(request.user.patients.all())
    patient_count = len(patients)
    pending_pushes = sum(1 for p in patients if p.voltage_pending)

    # Latest heart rate per patient (for the average and the "attention" list).
    latest_rates = []
    attention = []  # patients with a pending push or an out-of-range latest HR
    for p in patients:
        hr = p.latest_heart_rate
        if hr is not None:
            latest_rates.append(hr)
        abnormal = hr is not None and (hr < 60 or hr > 100)
        if p.voltage_pending or abnormal:
            attention.append({
                "patient": p,
                "hr": hr,
                "abnormal": abnormal,
                "pending": p.voltage_pending,
            })

    avg_hr = round(sum(latest_rates) / len(latest_rates)) if latest_rates else None
    total_readings = HeartRateRecord.objects.filter(patient__doctor=request.user).count()

    recent = sorted(patients, key=lambda p: p.updated_at, reverse=True)[:5]

    context = {
        "patient_count": patient_count,
        "pending_pushes": pending_pushes,
        "avg_hr": avg_hr,
        "total_readings": total_readings,
        "attention": attention[:6],
        "recent_patients": recent,
    }
    return render(request, "home.html", context)
