from flask import Blueprint, jsonify, request, session
from flask_login import login_required, current_user
from models import Movimentacao, Produto
from extensions import db

movimentacoes_bp = Blueprint('movimentacoes', __name__)

@movimentacoes_bp.route('', methods=['GET', 'POST'])
@login_required
def handle_movimentacoes():
    empresa_id = session.get('empresa_id')
    if not empresa_id:
        return jsonify({'error': 'Sessão inválida. Por favor, faça login novamente.'}), 401

    if request.method == 'GET':
        movs = Movimentacao.query.filter_by(empresa_id=empresa_id).order_by(Movimentacao.data_hora.desc()).all()
        return jsonify([m.to_dict() for m in movs])
        
    elif request.method == 'POST':
        data = request.json
        produto_id = data.get('produto_id')
        tipo = data.get('tipo')
        quantidade = int(data.get('quantidade', 0))
        
        produto = Produto.query.filter_by(id=produto_id, empresa_id=empresa_id).first_or_404()
        
        if tipo == 'SAIDA' and produto.quantidade_atual < quantidade:
            return jsonify({'error': 'Estoque insuficiente'}), 400
            
        nova_mov = Movimentacao(
            empresa_id=empresa_id,
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            motivo=data.get('motivo'),
            observacoes=data.get('observacoes'),
            usuario=current_user.nome if current_user.is_authenticated else 'Administrador'
        )
        
        # Atualiza a tabela de Produtos
        if tipo == 'ENTRADA':
            produto.quantidade_atual += quantidade
        elif tipo == 'SAIDA':
            produto.quantidade_atual -= quantidade
            
        db.session.add(nova_mov)
        db.session.commit()
        
        return jsonify(nova_mov.to_dict()), 201
