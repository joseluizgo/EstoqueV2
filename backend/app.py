from flask import Flask, request, jsonify
# pyrefly: ignore [missing-import]
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

# Configuração do MySQL (Ajuste usuário/senha se necessário)
# O padrão é root sem senha rodando no localhost
DB_URI = os.getenv('DATABASE_URL', 'mysql+pymysql://root:@localhost/estoquepro')
app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ===============================
# MODELOS (Models)
# ===============================
class Produto(db.Model):
    __tablename__ = 'produtos'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    nome = db.Column(db.String(255), nullable=False)
    categoria = db.Column(db.String(100), nullable=False)
    preco = db.Column(db.Numeric(10, 2), nullable=False)
    estoque_minimo = db.Column(db.Integer, nullable=False, default=0)
    quantidade_atual = db.Column(db.Integer, nullable=False, default=0)
    descricao = db.Column(db.Text)
    imagem_url = db.Column(db.String(255))
    
    movimentacoes = db.relationship('Movimentacao', backref='produto', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'sku': self.sku,
            'nome': self.nome,
            'categoria': self.categoria,
            'preco': float(self.preco),
            'estoque_minimo': self.estoque_minimo,
            'quantidade_atual': self.quantidade_atual,
            'descricao': self.descricao,
            'imagem_url': self.imagem_url
        }

class Movimentacao(db.Model):
    __tablename__ = 'movimentacoes'
    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    tipo = db.Column(db.Enum('ENTRADA', 'SAIDA'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    motivo = db.Column(db.String(100))
    observacoes = db.Column(db.Text)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow)
    usuario = db.Column(db.String(100), default='Administrador')

    def to_dict(self):
        return {
            'id': self.id,
            'produto_id': self.produto_id,
            'produto_nome': self.produto.nome if self.produto else 'Desconhecido',
            'produto_sku': self.produto.sku if self.produto else '-',
            'tipo': self.tipo,
            'quantidade': self.quantidade,
            'motivo': self.motivo,
            'observacoes': self.observacoes,
            'data_hora': self.data_hora.isoformat(),
            'usuario': self.usuario
        }

# ===============================
# ROTAS (API)
# ===============================

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    produtos = Produto.query.all()
    movimentacoes = Movimentacao.query.order_by(Movimentacao.data_hora.desc()).all()
    
    # Métricas
    total_produtos = len(produtos)
    itens_em_estoque = sum(p.quantidade_atual for p in produtos)
    estoque_baixo = sum(1 for p in produtos if p.quantidade_atual < p.estoque_minimo)
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
            'estoque_baixo': estoque_baixo,
            'valor_total': valor_total,
            'movimentacoes_hoje': movimentacoes_hoje
        },
        'grafico_categoria': categorias,
        'grafico_7dias': chart_7dias,
        'ultimas_movimentacoes': ultimas_movs,
        'lista_estoque': lista_estoque
    })


@app.route('/api/produtos', methods=['GET', 'POST'])
def handle_produtos():
    if request.method == 'GET':
        produtos = Produto.query.all()
        return jsonify([p.to_dict() for p in produtos])
        
    elif request.method == 'POST':
        data = request.json
        # Verificar duplicidade de SKU
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


@app.route('/api/produtos/<int:id>', methods=['PUT', 'DELETE'])
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


@app.route('/api/movimentacoes', methods=['GET', 'POST'])
def handle_movimentacoes():
    if request.method == 'GET':
        movs = Movimentacao.query.order_by(Movimentacao.data_hora.desc()).all()
        return jsonify([m.to_dict() for m in movs])
        
    elif request.method == 'POST':
        data = request.json
        produto_id = data.get('produto_id')
        tipo = data.get('tipo')
        quantidade = int(data.get('quantidade', 0))
        
        produto = Produto.query.get_or_404(produto_id)
        
        if tipo == 'SAIDA' and produto.quantidade_atual < quantidade:
            return jsonify({'error': 'Estoque insuficiente'}), 400
            
        nova_mov = Movimentacao(
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            motivo=data.get('motivo'),
            observacoes=data.get('observacoes')
        )
        
        # Atualiza a tabela de Produtos
        if tipo == 'ENTRADA':
            produto.quantidade_atual += quantidade
        elif tipo == 'SAIDA':
            produto.quantidade_atual -= quantidade
            
        db.session.add(nova_mov)
        db.session.commit()
        
        return jsonify(nova_mov.to_dict()), 201


if __name__ == '__main__':
    # Cria o banco local SQLite em caso de erro no MySQL só para desenvolvimento/testes
    # db.create_all() é útil apenas se usasse sqlite e quisesse criar auto.
    app.run(debug=True, port=5000)
