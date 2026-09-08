from django.shortcuts import render, redirect
from .models import Curso, Atividade, Projeto, Disciplina, ParticipacaoProjeto
from django.contrib.auth.decorators import login_required
from . decorators import autenticacao_obrigatoria
from .forms import DisciplinaForm, AtividadesForm, ProjetoForm



AREA_TEMPLATE_PREFIX = {
    'admin': 'admin',
    'contabil': 'contabeis',
    'agro': 'agronomico',
}


def get_template(usuario, view_name):
    """
    Retorna a lista de candidatos a template para uma view genérica do
    core, na ordem: template específico da área do usuário -> template
    genérico do core (fallback, usado enquanto a área ainda não tem
    tela própria).

    Ex.: get_template(usuario_do_agro, 'atividade_list')
         -> ['agronomico/atividade_list.html', 'core/atividade_list.html']
    """


    curso = getattr(usuario, 'curso', None)
    slug = getattr(curso, 'slug', None)
    prefixo = AREA_TEMPLATE_PREFIX.get(slug)


    candidatos=[]
    if prefixo:
        candidatos.append(f'{prefixo}/{view_name}.html')
    candidatos.append(f'core/{view_name}.html')
    return candidatos

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


# Atividades ---- CRUD e LIST

@login_required
def atividades_list(request):
    atividades = Atividade.objects.filter(usuario=request.user).select_related('disciplina')

    for atividade in atividades:
        atividade.sincronizar_status_atraso()

    context ={
        'atividades':atividades,
    }   
    return render(request, get_template(request.user, 'atividades_list'), context)


@login_required
def atividade_create(request):
    if request.method == 'POST':
        form = AtividadesForm(request.POST, usuario=request.user)
        if form.is_valid():
            atividade = form.save(commit=False)
            atividade.usuario = request.user
            atividade.save()
            return redirect('core:atividade_list')
    else:
        form = AtividadesForm(usuario=request.user)

    context = {
        'form': form,
    }
    return render(request, get_template(request.user, 'atividade_form'), context)


@login_required
def projetos_list(request):
    projetos = (
        Projeto.objects
        .filter(integrantes=request.user)
        .distinct()
        .order_by('prazo')
    )
 
    context = {
        'projetos': projetos,
    }
    return render(request, get_template(request.user, 'projetos_list'), context)


@login_required
def projeto_create(request):
    if request.method == 'POST':
        form = ProjetoForm(request.POST)
        if form.is_valid():
            projeto = form.save(commit=False)
            projeto.responsavel = request.user
            projeto.save()
            ParticipacaoProjeto.objects.create(projeto=projeto, usuario=request.user)
            return redirect('core:projeto_list')
    else:
        form = ProjetoForm()

    context = {
        'form': form,
    }
    return render(request, get_template(request.user, 'projeto_form'), context)


# Disciplinas ---- List e Create

@login_required
def disciplinas_list(request):
    disciplinas = Disciplina.objects.filter(usuario=request.user)

    context = {
        'disciplinas': disciplinas,
    }
    return render(request, get_template(request.user, 'disciplinas_list'), context)


@login_required
def disciplina_create(request):
    if request.method == 'POST':
        form = DisciplinaForm(request.POST)
        if form.is_valid():
            disciplina = form.save(commit=False)
            disciplina.usuario = request.user
            disciplina.save()
            return redirect('core:disciplina_list')
    else:
        form = DisciplinaForm()

    context = {
        'form': form,
    }
    return render(request, get_template(request.user, 'disciplina_form'), context)