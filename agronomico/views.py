from django.shortcuts import render


from core.decorators import area_obrigatoria, autenticacao_obrigatoria
from core.views import get_dashboard_context


@autenticacao_obrigatoria()
@area_obrigatoria('agro')
def dashboard(request):
    context = {
        'curso': request.user.curso,
        **get_dashboard_context(request.user),
    }
    return render(request, 'agro/index.html', context)