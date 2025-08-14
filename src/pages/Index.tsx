import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { OrderDashboard } from '@/components/OrderDashboard';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" onClick={() => navigate('/store-login')}>
          Store Login
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin-login')}>
          Admin Login
        </Button>
      </div>
      <OrderDashboard />
    </div>
  );
};

export default Index;
