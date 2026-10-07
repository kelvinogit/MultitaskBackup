from django.urls import path

from . import views

app_name = "agronomico"

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
]


