from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
import json
from core.decorators import autenticacao_obrigatoria

# Create your views here.

@autenticacao_obrigatoria(redirect_to='index')
def admin_dashboard(request):
    curso = request.user.curso
    return render(request, 'admindash.html', {'curso':curso})