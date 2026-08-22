from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from .forms import SignupForm, EmailLoginForm
from django.core.cache import cache 
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST


# Create your views here.


def check_rate_limit(request, key_prefix, limit=5, window=300):
    ip = request.META.get('REMOTE_ADDR')
    key = f'{key_prefix}:{ip}'
    attempts = cache.get(key, 0)
    if attempts >= limit:
        return False
    cache.set(key, attempts + 1, timeout=window)
    return True



def signup_view (request):
    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('index')
        open_signup = True

    else: 
        form = SignupForm()
        open_signup = False
    context = {
        'signup_form': form, 
        'open_signup':open_signup
    }
    return render(request, 'index.html', context)


def login_view(request):
    if request.methos == 'POST':
        form = EmailLoginForm(request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect('index')
        open_login = True
    else:
        form = EmailLoginForm()
        open_login = False

    context = {
        'login-form':form,
        'open_login':open_login
    }
    return render(request, 'index.html', context)

def logout_view(request):
    logout(request)
    return redirect('index.html')


