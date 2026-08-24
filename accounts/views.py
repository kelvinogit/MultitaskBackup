from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from .forms import SignupForm, EmailLoginForm
from django.core.cache import cache
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST


def check_rate_limit(request, key_prefix, limit=5, window=300):
    ip = request.META.get('REMOTE_ADDR')
    key = f'{key_prefix}:{ip}'
    attempts = cache.get(key, 0)
    if attempts >= limit:
        return False
    cache.set(key, attempts + 1, timeout=window)
    return True


@require_POST
def signup_view(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': False, 'errors': {'__all__': ['Dados inválidos.']}}, status=400)

    form = SignupForm({
        'nome': data.get('nome'),
        'email': data.get('email'),
        'senha': data.get('senha'),
        'confirmar': data.get('confirmar'),
        'curso': data.get('curso'),
    })

    if form.is_valid():
        user = form.save()
        login(request, user)
        return JsonResponse({'ok': True, 'nome': user.nome, 'curso': user.curso.nome})

    return JsonResponse({'ok': False, 'errors': form.errors}, status=400)


@require_POST
def login_view(request):
    if not check_rate_limit(request, 'login_attempts'):
        return JsonResponse(
            {'ok': False, 'errors': {'__all__': ['Muitas tentativas. Aguarde um instante.']}},
            status=429,
        )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': False, 'errors': {'__all__': ['Dados inválidos.']}}, status=400)

    form = EmailLoginForm(request, data={'username': data.get('email'), 'password': data.get('senha')})

    if form.is_valid():
        login(request, form.get_user())
        return JsonResponse({'ok': True, 'nome': form.get_user().nome})

    return JsonResponse({'ok': False, 'errors': form.errors}, status=400)


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'ok': True})