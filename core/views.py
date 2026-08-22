from django.shortcuts import render
from .models import Curso

# Create your views here.

def index(request):
    curso = Curso.objects.select_related('curso').all()

    context = {
        'cursos': curso
    }
    return render(request, 'index.html', context)


