from django.db.models import Sum
from django.shortcuts import render

from core.decorators import area_obrigatoria, autenticacao_obrigatoria
from core.models import Pontuacao, Projeto
from core.views import get_dashboard_context


@autenticacao_obrigatoria()
@area_obrigatoria('admin')
def admin_dashboard(request):
    dashboard_context = get_dashboard_context(request.user)
    contagem = dashboard_context['contagem_atividades']
    total_atividades = contagem['total']

    context = {
        'curso': request.user.curso,
        **dashboard_context,
        # O template admin/index.html já usa este nome.
        'contagem': contagem,
        'pontuacao_total': (
            Pontuacao.objects.filter(usuario=request.user).aggregate(
                total=Sum('pontos')
            )['total']
            or 0
        ),
        'taxa_conclusao': (
            round((contagem['concluidas'] / total_atividades) * 100)
            if total_atividades
            else 0
        ),
        'projetos_ativos_count': (
            Projeto.objects.filter(integrantes=request.user)
            .exclude(status=Projeto.Status.CONCLUIDO)
            .distinct()
            .count()
        ),
    }

    return render(request, 'admin/index.html', context)