from functools import wraps
from django.shortcuts import redirect

def autenticacao_obrigatoria(redirect_to=''):
    """
    Decorator customizado para exigir login e redirecionar para uma tela específica.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect(redirect_to)
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def area_obrigatoria(slug_esperado, redirect_to='core:dashboard'):
    """
    Restringe uma view baseada em função a usuários da área (curso)
    indicada em slug_esperado. Equivalente funcional de AreaRequiredMixin.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('core:index')
            curso = getattr(request.user, 'curso', None)
            if curso is None or curso.slug != slug_esperado:
                return redirect(redirect_to)
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

            

    
     
     