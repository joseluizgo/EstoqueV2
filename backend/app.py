from flask import Flask, jsonify
from flask_cors import CORS
from extensions import db, login_manager
from models import Administrador
import os

def create_app():
    app = Flask(__name__)
    
    # Configurações
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'super-secret-estoquepro-key-2026')
    DB_URI = os.getenv('DATABASE_URL', 'mysql+pymysql://root:@localhost/estoquepro')
    app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Configuração CORS com suporte a cookies/sessões
    CORS(app, supports_credentials=True)

    # Inicializar Extensões
    db.init_app(app)
    login_manager.init_app(app)
    
    # Configuração do Login Manager
    @login_manager.user_loader
    def load_user(user_id):
        return Administrador.query.get(int(user_id))
        
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Acesso negado. Por favor, faça login.'}), 401

    # Registrar Blueprints
    from routes.auth import auth_bp
    from routes.produtos import produtos_bp
    from routes.movimentacoes import movimentacoes_bp
    from routes.dashboard import dashboard_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(produtos_bp, url_prefix='/api/produtos')
    app.register_blueprint(movimentacoes_bp, url_prefix='/api/movimentacoes')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)

