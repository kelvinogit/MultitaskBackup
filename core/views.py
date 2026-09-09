from django.shortcuts import render, redirect, get_object_or_404
from .models import Curso, Atividade, Projeto, Disciplina, ParticipacaoProjeto
from django.contrib.auth.decorators import login_required
from . decorators import autenticacao_obrigatoria
from .forms import DisciplinaForm, AtividadesForm, ProjetoForm
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.utils import timezone



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
def atividade_detail(request, pk):
    """
    Retorna os dados de uma atividade em JSON, pra preencher o modal
    de visualização/edição sem recarregar a página.
    """
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)

    prazo_local = timezone.localtime(atividade.prazo) if atividade.prazo else None

    data = {
        'id': atividade.pk,
        'titulo': atividade.titulo,
        'descricao': atividade.descricao,
        'disciplina_id': atividade.disciplina_id,
        'tipo': atividade.tipo,
        'prazo': prazo_local.strftime('%Y-%m-%dT%H:%M') if prazo_local else '',
        'prioridade': atividade.prioridade,
        'status': atividade.status,
        'observacoes': atividade.observacoes,
        'choices': {
            'tipo': list(Atividade.Tipo.choices),
            'prioridade': list(Atividade.Prioridade.choices),
            'status': list(Atividade.Status.choices),
        },
        'disciplinas': list(
            Disciplina.objects.filter(usuario=request.user).values('id', 'nome')
        ),
    }
    return JsonResponse(data)


@login_required
@require_POST
def atividade_update(request, pk):
    """
    Atualiza uma atividade existente (inclui a troca de status) via JSON,
    usado pelo formulário dentro do modal.
    """
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)
    form = AtividadesForm(request.POST, instance=atividade, usuario=request.user)

    if form.is_valid():
        atividade = form.save()
        prazo_local = timezone.localtime(atividade.prazo) if atividade.prazo else None
        return JsonResponse({
            'ok': True,
            'atividade': {
                'id': atividade.pk,
                'titulo': atividade.titulo,
                'disciplina_nome': atividade.disciplina.nome,
                'prazo_exibicao': prazo_local.strftime('%d/%m/%Y %H:%M') if prazo_local else '',
                'status': atividade.status,
                'status_display': atividade.get_status_display(),
            },
        })

    return JsonResponse({'ok': False, 'errors': form.errors}, status=400)


@login_required
@require_POST
def atividade_finalizar(request, pk):
    """
    Finaliza uma atividade do usuário autenticado sem exigir o envio de
    todos os campos do formulário de edição.
    """
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)

    if atividade.status != Atividade.Status.CONCLUIDA:
        atividade.status = Atividade.Status.CONCLUIDA
        atividade.save(update_fields=['status'])

    return JsonResponse({
        'ok': True,
        'atividade': {
            'id': atividade.pk,
            'status': atividade.status,
            'status_display': atividade.get_status_display(),
        },
    })


@login_required
@require_POST
def atividade_delete(request, pk):
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)
    atividade.delete()
    return JsonResponse({'ok': True})


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
