from flask import Blueprint, request, jsonify, session
# pyrefly: ignore [missing-import]
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from werkzeug.security import check_password_hash, generate_password_hash
from models import Administrador
from extensions import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    senha = data.get('senha')

    if not email or not senha:
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    admin = Administrador.query.filter_by(email=email).first()
    
    if admin and check_password_hash(admin.senha_hash, senha):
        login_user(admin)
        session['empresa_id'] = admin.empresa_id
        return jsonify({'message': 'Login realizado com sucesso', 'user': admin.to_dict()}), 200
    else:
        return jsonify({'error': 'Credenciais inválidas'}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    session.pop('empresa_id', None)
    return jsonify({'message': 'Logout realizado com sucesso'}), 200

@auth_bp.route('/me', methods=['GET'])
def me():
    if current_user.is_authenticated:
        return jsonify({'user': current_user.to_dict()}), 200
    return jsonify({'error': 'Não autenticado'}), 401
