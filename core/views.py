from django.shortcuts import render, redirect
from .models import Curso
from django.contrib.auth.decorators import login_required
# Create your views here.

def index(request):
    curso = Curso.objects.all()

    context = {
        'cursos': curso
    }
    return render(request, 'index.html', context)

@login_required
def dashboard(request):
    curso = request.user.curso

    if curso is None:
        return render(request, 'core/index.html')

    destino = {
        'contabil': 'contabeis:dashboard',
        'agro': 'agronomico:dashboard',
        'administracao': 'administraco:dashboard',
    }.get(curso.slug)

    if destino is None:
        # slug não mapeado — cai num dashboard genérico do core em vez de quebrar
        return render(request, 'core/index.html', {'curso': curso})

    return redirect(destino)


