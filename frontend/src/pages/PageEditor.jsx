import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import LandingPageEditor from '@/components/admin/LandingPageEditor';

export default function PageEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="font-bold">Editing Page: {pageId}</h1>
      </div>
      <LandingPageEditor pageId={pageId} />
    </div>
  );
}
