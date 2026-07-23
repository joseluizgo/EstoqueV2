from flask import Blueprint, jsonify
from flask_login import login_required
from models import Produto, Movimentacao
from extensions import db
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('', methods=['GET'])
@login_required
def get_dashboard():
    produtos = Produto.query.all()
    movimentacoes = Movimentacao.query.order_by(Movimentacao.data_hora.desc()).all()
    
    # Métricas
    total_produtos = len(produtos)
    itens_em_estoque = sum(p.quantidade_atual for p in produtos)
    estoque_baixo = sum(1 for p in produtos if p.quantidade_atual <= p.estoque_minimo and p.quantidade_atual > 0)
    estoque_zerado = sum(1 for p in produtos if p.quantidade_atual == 0)
    valor_total = sum(p.quantidade_atual * float(p.preco) for p in produtos)
    
    # Movimentações Hoje
    hoje = datetime.utcnow().date()
    movimentacoes_hoje = sum(1 for m in movimentacoes if m.data_hora.date() == hoje)
    
    # Gráfico 1: Estoque por Categoria
    categorias = {}
    for p in produtos:
        if p.categoria in categorias:
            categorias[p.categoria] += p.quantidade_atual
        else:
            categorias[p.categoria] = p.quantidade_atual
            
    # Gráfico 2: Movimentações últimos 7 dias
    sete_dias_atras = datetime.utcnow() - timedelta(days=7)
    movs_recentes = Movimentacao.query.filter(Movimentacao.data_hora >= sete_dias_atras).all()
    
    chart_7dias = {'entradas': {}, 'saidas': {}}
    for i in range(7):
        d = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
        chart_7dias['entradas'][d] = 0
        chart_7dias['saidas'][d] = 0
        
    for m in movs_recentes:
        dia = m.data_hora.strftime('%Y-%m-%d')
        if dia in chart_7dias['entradas']:
            if m.tipo == 'ENTRADA':
                chart_7dias['entradas'][dia] += m.quantidade
            else:
                chart_7dias['saidas'][dia] += m.quantidade
                
    ultimas_movs = [m.to_dict() for m in movimentacoes[:5]]
    lista_estoque = [p.to_dict() for p in produtos]

    return jsonify({
        'metricas': {
            'total_produtos': total_produtos,
            'itens_em_estoque': itens_em_estoque,
            'estoque_baixo': estoque_baixo + estoque_zerado,
            'valor_total': valor_total,
            'movimentacoes_hoje': movimentacoes_hoje
        },
        'grafico_categoria': categorias,
        'grafico_7dias': chart_7dias,
        'ultimas_movimentacoes': ultimas_movs,
        'lista_estoque': lista_estoque
    })
