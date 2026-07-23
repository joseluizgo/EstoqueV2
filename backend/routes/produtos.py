from flask import Blueprint, jsonify, request
from flask_login import login_required
from models import Produto
from extensions import db

produtos_bp = Blueprint('produtos', __name__)

@produtos_bp.route('', methods=['GET', 'POST'])
@login_required
def handle_produtos():
    if request.method == 'GET':
        produtos = Produto.query.all()
        return jsonify([p.to_dict() for p in produtos])
        
    elif request.method == 'POST':
        data = request.json
        if Produto.query.filter_by(sku=data.get('sku')).first():
            return jsonify({'error': 'SKU já cadastrado'}), 400
            
        novo_produto = Produto(
            sku=data.get('sku'),
            nome=data.get('nome'),
            categoria=data.get('categoria'),
            preco=data.get('preco'),
            estoque_minimo=data.get('estoque_minimo', 0),
            quantidade_atual=data.get('quantidade_atual', 0),
            descricao=data.get('descricao', '')
        )
        db.session.add(novo_produto)
        db.session.commit()
        return jsonify(novo_produto.to_dict()), 201

@produtos_bp.route('/<int:id>', methods=['PUT', 'DELETE'])
@login_required
def edit_produto(id):
    produto = Produto.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(produto)
        db.session.commit()
        return jsonify({'message': 'Produto deletado'}), 200
    
    if request.method == 'PUT':
        data = request.json
        produto.nome = data.get('nome', produto.nome)
        produto.categoria = data.get('categoria', produto.categoria)
        produto.preco = data.get('preco', produto.preco)
        produto.estoque_minimo = data.get('estoque_minimo', produto.estoque_minimo)
        db.session.commit()
        return jsonify(produto.to_dict())
