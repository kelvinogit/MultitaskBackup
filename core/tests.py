from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Atividade, Disciplina

class AtividadeFinalizarViewTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            email='aluno@example.com', nome='Aluno', password='senha-segura'
        )
        self.disciplina = Disciplina.objects.create(
            nome='Desenvolvimento Web', usuario=self.usuario
        )
        self.atividade = Atividade.objects.create(
            titulo='Entregar projeto',
            disciplina=self.disciplina,
            prazo=timezone.now(),
            usuario=self.usuario,
        )

    def test_finalizar_altera_status_para_concluida(self):
        self.client.force_login(self.usuario)

        response = self.client.post(
            reverse('core:atividade_finalizar', args=[self.atividade.pk])
        )

        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(
            response.content,
            {
                'ok': True,
                'atividade': {
                    'id': self.atividade.pk,
                    'status': Atividade.Status.CONCLUIDA,
                    'status_display': 'Concluída',
                },
            },
        )
        self.atividade.refresh_from_db()
        self.assertEqual(self.atividade.status, Atividade.Status.CONCLUIDA)

    def test_finalizar_so_aceita_post(self):
        self.client.force_login(self.usuario)

        response = self.client.get(
            reverse('core:atividade_finalizar', args=[self.atividade.pk])
        )

        self.assertEqual(response.status_code, 405)

    def test_finalizar_nao_permite_atividade_de_outro_usuario(self):
        outro_usuario = get_user_model().objects.create_user(
            email='outro@example.com', nome='Outro aluno', password='senha-segura'
        )
        self.client.force_login(outro_usuario)

        response = self.client.post(
            reverse('core:atividade_finalizar', args=[self.atividade.pk])
        )

        self.assertEqual(response.status_code, 404)
        self.atividade.refresh_from_db()
        self.assertEqual(self.atividade.status, Atividade.Status.PENDENTE)
