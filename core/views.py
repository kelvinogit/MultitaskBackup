from django.shortcuts import render
from .models import Curso

# Create your views here.

def index(request):
    curso = Curso.objects.all()

    context = {
        'curso': curso
    }
    return render(request, 'index.html', context)