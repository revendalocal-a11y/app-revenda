-- Execute este SQL no SQL Editor do seu projeto Supabase

-- 1. Tabelas
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  referencia TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco_custo NUMERIC(10,2) DEFAULT 0,
  preco_venda NUMERIC(10,2) DEFAULT 0,
  descricao TEXT,
  categoria TEXT,
  estoque INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  data TIMESTAMPTZ DEFAULT now(),
  valor_total NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (
    status IN ('Pedido feito','Pedido em rota de entrega','Pedido pago')
  ),
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL
);

CREATE TABLE kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  coluna TEXT NOT NULL CHECK (
    coluna IN ('Pedido feito','Pedido em rota de entrega','Pedido pago')
  ),
  posicao INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE faturamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  valor NUMERIC(10,2),
  data TIMESTAMPTZ DEFAULT now()
);

-- 2. Triggers
CREATE OR REPLACE FUNCTION add_to_faturamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Pedido pago' THEN
    INSERT INTO faturamento (pedido_id, cliente_id, valor)
    VALUES (NEW.id, NEW.cliente_id, NEW.valor_total);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_add_to_faturamento
AFTER UPDATE OF status ON pedidos
FOR EACH ROW
EXECUTE FUNCTION add_to_faturamento();

-- 3. RLS Policies
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário só vê próprios dados clientes" ON clientes FOR ALL USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Usuário só vê próprios dados produtos" ON produtos FOR ALL USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Usuário só vê próprios dados pedidos" ON pedidos FOR ALL USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Usuário só vê próprios dados itens" ON pedido_itens FOR ALL USING (EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = pedido_itens.pedido_id AND pedidos.usuario_id = auth.uid()));
CREATE POLICY "Usuário só vê próprios dados kanban" ON kanban_cards FOR ALL USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Usuário só vê próprios dados faturamento" ON faturamento FOR ALL USING (EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = faturamento.pedido_id AND pedidos.usuario_id = auth.uid()));
