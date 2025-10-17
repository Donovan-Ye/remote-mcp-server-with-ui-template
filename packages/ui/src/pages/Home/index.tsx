import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex mt-20 justify-center p-4">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            MCP UI home page
          </h1>
          <p className="text-slate-600 text-lg">
            Explore the features of the MCP UI.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/get-ali-logs')}>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Get Ali Logs
                </h2>
                <p className="text-slate-600 mb-4">
                  Query and view logs from mock Ali Cloud SLS. Select projects, logstores, and filter by time range.
                </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/ui/get-ali-logs?alone=true');
                  }}
                  className="group"
                >
                  Open Log Viewer
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
