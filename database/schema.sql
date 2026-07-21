-- Script de Criação do Banco de Dados EstoquePro

CREATE DATABASE IF NOT EXISTS estoquepro;
USE estoquepro;

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    estoque_minimo INT NOT NULL DEFAULT 0,
    quantidade_atual INT NOT NULL DEFAULT 0,
    descricao TEXT,
    imagem_url VARCHAR(255)
);

-- Tabela de Movimentações
CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tipo ENUM('ENTRADA', 'SAIDA') NOT NULL,
    quantidade INT NOT NULL,
    motivo VARCHAR(100),
    observacoes TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100) DEFAULT 'Administrador',
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- Inserir alguns dados de exemplo (Opcional, para testes)
INSERT IGNORE INTO produtos (sku, nome, categoria, preco, estoque_minimo, quantidade_atual, descricao) VALUES 
('PRD-001', 'Teclado Mecânico RGB', 'Eletrônicos', 350.00, 10, 25, 'Teclado mecânico switch azul'),
('PRD-002', 'Mouse Gamer Wireless', 'Eletrônicos', 250.00, 15, 8, 'Mouse sem fio 10000 DPI'),
('PRD-003', 'Monitor 27" IPS', 'Informática', 1200.00, 5, 12, 'Monitor Ultrawide');

INSERT IGNORE INTO movimentacoes (produto_id, tipo, quantidade, motivo, observacoes) VALUES
(1, 'ENTRADA', 25, 'Compra de Fornecedor', 'Nota fiscal 1234'),
(2, 'ENTRADA', 10, 'Compra de Fornecedor', 'Nota fiscal 1234'),
(2, 'SAIDA', 2, 'Venda', 'Pedido #102'),
(3, 'ENTRADA', 12, 'Compra de Fornecedor', 'Nota fiscal 1235');
