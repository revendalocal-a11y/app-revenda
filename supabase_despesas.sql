-- Create Despesas Table
CREATE TABLE IF NOT EXISTS despesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users NOT NULL,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  categoria TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own expenses" ON despesas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own expenses" ON despesas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own expenses" ON despesas
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own expenses" ON despesas
  FOR DELETE USING (auth.uid() = usuario_id);
