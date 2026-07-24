-- Script de Criação do Banco de Dados EstoquePro

CREATE DATABASE IF NOT EXISTS estoquepro;
USE estoquepro;

-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Administradores
CREATE TABLE IF NOT EXISTS administradores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    sku VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    estoque_minimo INT NOT NULL DEFAULT 0,
    quantidade_atual INT NOT NULL DEFAULT 0,
    descricao TEXT,
    imagem_url VARCHAR(255),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE (sku, empresa_id)
);

-- Tabela de Movimentações
CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    produto_id INT NOT NULL,
    tipo ENUM('ENTRADA', 'SAIDA') NOT NULL,
    quantidade INT NOT NULL,
    motivo VARCHAR(100),
    observacoes TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100) DEFAULT 'Administrador',
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- Inserir Empresa Padrão
INSERT IGNORE INTO empresas (id, nome) VALUES (1, 'Minha Empresa Default');

-- Inserir alguns dados de exemplo (Opcional, para testes)
INSERT IGNORE INTO produtos (empresa_id, sku, nome, categoria, preco, estoque_minimo, quantidade_atual, descricao) VALUES 
(1, 'PRD-001', 'Teclado Mecânico RGB', 'Eletrônicos', 350.00, 10, 25, 'Teclado mecânico switch azul'),
(1, 'PRD-002', 'Mouse Gamer Wireless', 'Eletrônicos', 250.00, 15, 8, 'Mouse sem fio 10000 DPI'),
(1, 'PRD-003', 'Monitor 27" IPS', 'Informática', 1200.00, 5, 12, 'Monitor Ultrawide');

INSERT IGNORE INTO movimentacoes (empresa_id, produto_id, tipo, quantidade, motivo, observacoes) VALUES
(1, 1, 'ENTRADA', 25, 'Compra de Fornecedor', 'Nota fiscal 1234'),
(1, 2, 'ENTRADA', 10, 'Compra de Fornecedor', 'Nota fiscal 1234'),
(1, 2, 'SAIDA', 2, 'Venda', 'Pedido #102'),
(1, 3, 'ENTRADA', 12, 'Compra de Fornecedor', 'Nota fiscal 1235');

-- Administrador Padrão (Senha: admin123)
INSERT IGNORE INTO administradores (empresa_id, nome, email, senha_hash) VALUES
(1, 'Administrador', 'admin@estoquepro.com', 'scrypt:32768:8:1$3KDK04RJTPsWOO1w$44745553c76b311356eb59e8a84a2c472d49e36f37ca851b82bd14083cfb9a1024031474343b6c9e889fa6d314811a43104aee23e9e625617db708cb9b84a49f');
