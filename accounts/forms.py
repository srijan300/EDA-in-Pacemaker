from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm

# pyrefly: ignore [missing-import]
from captcha.fields import CaptchaField


class SignUpForm(forms.ModelForm):
    email = forms.EmailField(required=True)
    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirm password", widget=forms.PasswordInput)
    captcha = CaptchaField()

    class Meta:
        model = User
        fields = ["username", "email"]

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("This username is already taken.")
        return username

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            self.add_error("password2", "Passwords do not match.")
        if password1 and len(password1) < 8:
            self.add_error("password1", "Password must be at least 8 characters long.")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        # Account stays inactive until the user clicks the email verification link
        user.is_active = False
        if commit:
            user.save()
        return user


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        label="Email", 
        widget=forms.TextInput(attrs={'autofocus': True})
    )
    captcha = CaptchaField()

class AutoGeneratePasswordForm(forms.Form):
    email = forms.EmailField(required=True, label="Registered Email")
