from  django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect

class AreaRequiredMixin(LoginRequiredMixin):
       """
    Restringe o acesso a views de um módulo diferencial (Contábil, Agro,
    Administração) a usuários cujo Curso.slug corresponda a `area_slug`.

    Uso:
        class DesafioListView(AreaRequiredMixin, ListView):
            area_slug = 'contabil'
            model = Desafio
    """

       area_slug = None
       login_url = 'core:index'

       def dispatch(self, request, *args, **kwargs):
              if not request.user.is_authenticated:
                return self.handle_no_permission()

              curso = getattr(request.user, 'curso', None)
              if self.area_slug and (curso is None or curso.slug != self.area_slug):
                   return redirect('core:index')

              return super().dispatch(request, *args, **kwargs)

       

        