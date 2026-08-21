from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from .forms import SignupForm, EmailLoginForm


# Create your views here.

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
