from extensions import db
from flask_login import UserMixin
from datetime import datetime

class Administrador(UserMixin, db.Model):
    __tablename__ = 'administradores'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None
        }

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
