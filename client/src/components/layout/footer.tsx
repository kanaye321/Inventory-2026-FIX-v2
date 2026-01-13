import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [, setLocation] = useLocation();
  
  const handleUserManualClick = () => {
    setLocation("/user-manual");
  };
  
  return (
    <>
      <footer className="bg-card border-t border-border p-4 flex justify-center items-center">
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} SRPH-MIS Inventory Management System
        </p>
      </footer>
      
      {/* Floating Help Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          size="sm" 
          className="shadow-lg hover:shadow-xl transition-shadow duration-200 bg-primary hover:bg-primary/90 flex items-center gap-2"
          onClick={handleUserManualClick}
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </div>
    </>
  );
}
