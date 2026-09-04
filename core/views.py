from django.shortcuts import render, redirect
from .models import Curso, Atividade, Projeto, Disciplina
from django.contrib.auth.decorators import login_required
from . decorators import autenticacao_obrigatoria

def index(request):
    curso = Curso.objects.all()
    context = {
        'cursos': curso
    }
    return render(request, 'index.html', context)



def get_dashboard_context (usuario):
    """
    Calcula a seção fixa do dashboard (contagens por status + próximas
    atividades) para um usuário. Deve ser chamada por qualquer view de
    dashboard de área (administraco, contabeis, agronomico) e combinada
    com o bloco condicional específico daquela área.
    """

    atividades = Atividade.objects.filter(usuario=usuario)
    contagem = {
        'pendentes': atividades.filter(status=Atividade.Status.PENDENTE).count(),
        'andamento': atividades.filter(status=Atividade.Status.ANDAMENTO).count(),
        'concluidas': atividades.filter(status=Atividade.Status.CONCLUIDA).count(),
        'atrasadas': atividades.filter(status=Atividade.Status.ATRASADA).count(),
    }

    contagem['total'] = sum(contagem.values())

    proximas_atividades = (
        atividades
        .exclude(status=Atividade.Status.CONCLUIDA)
        .order_by('prazo')[:5]
    )

    return{
        'contagem_atividades':contagem,
        'proximas_atividades': proximas_atividades,
    }

@autenticacao_obrigatoria()
def dashboard(request):
    curso = request.user.curso

    if curso is None:
        return render(request, 'index.html')

    destino = {
        'contabil': 'contabeis:dashboard',
        'agro': 'agronomico:dashboard',
        'admin': 'administraco:admindash',
    }.get(curso.slug)

    if destino is None:
        # slug não mapeado — cai num dashboard genérico do core em vez de quebrar
        return render(request, 'index.html', {'curso': curso})

    return redirect(destino)

# CRUD genérico — Disciplina







