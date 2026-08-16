from django.shortcuts import render

# Create your views here.

def contabeis(request):
    return render(request, 'contabeis/indexContabeis.html')