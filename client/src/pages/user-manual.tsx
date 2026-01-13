
import { BookOpen, Mail, AlertTriangle, Check, Database, Cog, UserCog, LifeBuoy, Shield, Activity, Monitor, Network, Settings, Users, HardDrive, Package, Key, FileText, Search, Eye, Edit, Plus, Download, Upload, RefreshCw, Filter, Calendar, Clock, Bell, ChevronRight, Laptop, Server, Printer, Keyboard, Mouse, Cable, Box, Lock, BarChart, FileSpreadsheet, AlertCircle, Trash2 } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function UserManualPage() {
  return (
    <div className="container py-4 md:py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
        <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          SRPH-MIS Complete User Manual
        </h1>
      </div>

      <div className="mb-8 md:mb-10">
        <Card className="overflow-hidden border-2 border-primary/20">
          <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-primary/5 to-blue-600/5">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Welcome to SRPH-MIS Inventory Management System
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Your comprehensive guide to mastering the SRPH-MIS platform - from basic navigation to advanced administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <p className="text-muted-foreground">
              SRPH-MIS is a powerful, enterprise-grade inventory management system designed for efficient asset tracking,
              user management, virtual machine monitoring, network discovery, and comprehensive reporting. This complete guide 
              covers every feature and functionality to help you maximize your productivity.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">Asset Management</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">VM Monitoring</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                <Network className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">Network Discovery</span>
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important Security Notice</AlertTitle>
              <AlertDescription>
                Always ensure you have appropriate permissions before performing administrative actions. 
                Contact your system administrator if you need additional access.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-3">Overview</TabsTrigger>
          <TabsTrigger value="navigation" className="text-xs sm:text-sm py-3">Navigation</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs sm:text-sm py-3">Assets</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs sm:text-sm py-3">Monitoring</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm py-3">Users</TabsTrigger>
          <TabsTrigger value="admin" className="text-xs sm:text-sm py-3">Admin</TabsTrigger>
          <TabsTrigger value="troubleshooting" className="text-xs sm:text-sm py-3">Support</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">System Overview</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Dashboard Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Real-time inventory statistics with auto-refresh
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Asset status distribution charts
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Recent activity timeline with filtering
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Quick action shortcuts to common tasks
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    System health indicators and alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Customizable page size for data views (10-50 items)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Role-based access control (RBAC)
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Granular permission settings per module
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Complete activity audit trails
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Secure authentication with session management
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Department-based access controls
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    Encrypted sensitive data storage
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="getting-started">
              <AccordionTrigger className="text-left">Getting Started Guide</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Step 1: First Login</h4>
                    <ol className="list-decimal pl-6 space-y-1 text-sm">
                      <li>Navigate to the SRPH-MIS login page</li>
                      <li>Enter your username and password</li>
                      <li>If this is your first login, you may be prompted to change your password</li>
                      <li>Familiarize yourself with the dashboard layout</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 2: Understanding Your Role</h4>
                    <p className="text-sm mb-2">Your access level determines what features you can use:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li><strong>Administrator:</strong> Full system access including user management and database operations</li>
                      <li><strong>Asset Manager:</strong> Can manage assets, components, licenses, and perform checkout operations</li>
                      <li><strong>Department User:</strong> Can view and manage department-specific assets</li>
                      <li><strong>Read-Only:</strong> View-only access to assigned resources</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Step 3: Initial Setup Tasks</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Review your department's current asset inventory</li>
                      <li>Update your profile information if needed</li>
                      <li>Familiarize yourself with the navigation menu</li>
                      <li>Explore the dashboard to understand key metrics</li>
                      <li>Set your preferred page size for data tables</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quick-reference">
              <AccordionTrigger className="text-left">Quick Reference Card</AccordionTrigger>
              <AccordionContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Common Actions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Add new asset:</span>
                        <Badge variant="secondary">Assets → Add Asset</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Check out asset:</span>
                        <Badge variant="secondary">Find Asset → Checkout</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Import assets (CSV):</span>
                        <Badge variant="secondary">Assets → Import</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Export filtered data:</span>
                        <Badge variant="secondary">Table → Export CSV</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Manage users:</span>
                        <Badge variant="secondary">Users → Add/Edit</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Filter & Search Tips</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline">Multi-Filter</Badge>
                        <span className="text-xs">Combine category, status, department, and condition filters</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline">Knox ID Search</Badge>
                        <span className="text-xs">Search by Knox ID to find all assets assigned to a user</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline">Clear All</Badge>
                        <span className="text-xs">Use "Clear Filters" button to reset all active filters</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline">Page Size</Badge>
                        <span className="text-xs">Adjust items per page: 10, 20, 30, 40, or 50</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">Navigation & Interface</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="sidebar-navigation">
              <AccordionTrigger>Sidebar Navigation Menu</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Inventory Management
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Dashboard:</strong> System overview and key metrics</li>
                      <li><strong>Assets:</strong> Hardware inventory (computers, servers, printers, etc.)</li>
                      <li><strong>Components:</strong> Internal hardware parts (RAM, CPU, storage, etc.)</li>
                      <li><strong>Accessories:</strong> Peripheral devices (keyboards, mice, monitors, etc.)</li>
                      <li><strong>Consumables:</strong> Supplies and consumable items (toner, paper, etc.)</li>
                      <li><strong>Licenses:</strong> Software licenses and assignments</li>
                      <li><strong>IT Equipment:</strong> General IT equipment tracking</li>
                      <li><strong>Monitor Inventory:</strong> Dedicated monitor tracking system</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Monitoring & Discovery
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>VM Monitoring:</strong> Virtual machine status via Zabbix integration</li>
                      <li><strong>Network Discovery:</strong> Scan and inventory network devices</li>
                      <li><strong>Network Dashboard:</strong> Analytics on discovered devices</li>
                      <li><strong>VM Inventory:</strong> Virtual machine lifecycle management</li>
                      <li><strong>BitLocker Keys:</strong> Recovery key management system</li>
                      <li><strong>IAM Accounts:</strong> Identity and access management</li>
                    </ul>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      User Management
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Users:</strong> User account management and profiles</li>
                      <li><strong>User Permissions:</strong> Role and permission configuration</li>
                      <li><strong>Activities:</strong> Complete system activity logs and audit trails</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Reporting & Admin
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Reports:</strong> Generate various system reports with export options</li>
                      <li><strong>Admin:</strong> System administration and configuration settings</li>
                      <li><strong>Database:</strong> Database backup, restore, and maintenance tools</li>
                      <li><strong>Email Notifications:</strong> Automated email notification system</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="search-functionality">
              <AccordionTrigger>Global Search & Advanced Filtering</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Capabilities
                  </h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Search across all asset types using the global search bar</li>
                    <li>Find items by asset tag, serial number, model, name, or Knox ID</li>
                    <li>Search for users by username, name, department, or Knox ID</li>
                    <li>Multi-field search: searches simultaneously across multiple fields</li>
                    <li>Real-time search results as you type</li>
                    <li>Case-insensitive search functionality</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Advanced Filter Options
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Asset Filters:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Status (Available, Checked Out, Maintenance, Retired)</li>
                        <li>Category (Laptop, Desktop, Server, Printer, etc.)</li>
                        <li>Department assignment</li>
                        <li>Condition (Good, Fair, Bad)</li>
                        <li>Date ranges (Purchase date, Warranty expiration)</li>
                        <li>Combine multiple filters for precise results</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Display Options:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Page size selection (10, 20, 30, 40, 50 items)</li>
                        <li>Pagination for large datasets</li>
                        <li>Table column sorting</li>
                        <li>Resizable dialog forms for better visibility</li>
                        <li>Dark/Light theme toggle</li>
                        <li>Responsive design for mobile devices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Search className="h-4 w-4" />
                  <AlertTitle>Search Tips</AlertTitle>
                  <AlertDescription>
                    When searching by Knox ID, the system shows the total count of assets assigned to that ID. 
                    Use the "Clear Filters" button to quickly reset all active filters and return to the full dataset.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="interface-customization">
              <AccordionTrigger>Interface Customization & Data Export</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Display Options</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Toggle between light and dark themes system-wide</li>
                    <li>Customize table column visibility and order</li>
                    <li>Adjust items per page (10-50) in all data tables</li>
                    <li>Resizable dialog forms for better data entry experience</li>
                    <li>Responsive layouts for desktop, tablet, and mobile</li>
                    <li>Persistent filter states during navigation</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Data Export Features</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Export filtered data to CSV format</li>
                    <li>Automatic filename generation with filter information</li>
                    <li>Includes active search terms and filter states in filename</li>
                    <li>Export only visible/filtered data or full dataset</li>
                    <li>Customizable export fields and columns</li>
                    <li>Notification on successful export with item count</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Accessibility Features</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Full keyboard navigation support</li>
                    <li>High contrast mode available</li>
                    <li>Screen reader compatibility</li>
                    <li>Adjustable font sizes</li>
                    <li>Focus indicators for all interactive elements</li>
                    <li>ARIA labels for better accessibility</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">Complete Asset Management Guide</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="asset-types">
              <AccordionTrigger>Understanding Asset Types</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Laptop className="h-4 w-4" />
                        Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <p className="font-medium mb-2">Examples:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Laptops & Desktops</li>
                        <li>Servers & Network Equipment</li>
                        <li>Printers & Scanners</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">Key Info:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Asset tag & Serial number</li>
                        <li>Knox ID assignment</li>
                        <li>IP & MAC addresses</li>
                        <li>OS Type & Status</li>
                        <li>Warranty & Location</li>
                        <li>Purchase details</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Components
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <p className="font-medium mb-2">Examples:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>RAM & CPU</li>
                        <li>Hard drives & SSDs</li>
                        <li>Graphics cards</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">Key Info:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Specifications</li>
                        <li>Compatibility</li>
                        <li>Parent asset link</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Keyboard className="h-4 w-4" />
                        Accessories
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <p className="font-medium mb-2">Examples:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Keyboards & Mice</li>
                        <li>Monitors & Webcams</li>
                        <li>Cables & Adapters</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">Key Info:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Compatibility</li>
                        <li>Condition</li>
                        <li>Availability status</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        Consumables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <p className="font-medium mb-2">Examples:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Toner & Ink</li>
                        <li>Paper & Batteries</li>
                        <li>Cleaning supplies</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">Key Info:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Quantity tracking</li>
                        <li>Reorder levels</li>
                        <li>Supplier information</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Licenses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <p className="font-medium mb-2">Examples:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Windows & Office</li>
                        <li>Antivirus software</li>
                        <li>CAD & Design tools</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">Key Info:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>License keys</li>
                        <li>Expiration dates</li>
                        <li>User assignments</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="asset-lifecycle">
              <AccordionTrigger>Asset Lifecycle Management</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adding New Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal pl-6 space-y-2 text-sm">
                        <li>Navigate to Assets → Add Asset button</li>
                        <li>Fill in required information:
                          <ul className="list-disc pl-6 mt-1">
                            <li>Asset tag (auto-generated or custom)</li>
                            <li>Name, model, and serial number</li>
                            <li>Category and manufacturer</li>
                            <li>Knox ID (for user assignment)</li>
                            <li>IP address and MAC address</li>
                            <li>OS Type (Windows, Linux, macOS, etc.)</li>
                          </ul>
                        </li>
                        <li>Add financial details:
                          <ul className="list-disc pl-6 mt-1">
                            <li>Purchase date and cost</li>
                            <li>Warranty information</li>
                            <li>Supplier details</li>
                          </ul>
                        </li>
                        <li>Set initial status and condition</li>
                        <li>Assign to department and location</li>
                        <li>Add custom fields and notes</li>
                      </ol>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Bulk Import Process
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal pl-6 space-y-2 text-sm">
                        <li>Click "Import Assets" button</li>
                        <li>Download the CSV template or use Excel (save as CSV)</li>
                        <li>Fill in asset information following the format</li>
                        <li>Required columns:
                          <ul className="list-disc pl-6 mt-1">
                            <li>name, model, serial</li>
                            <li>category, manufacturer</li>
                            <li>status, location</li>
                            <li>department</li>
                          </ul>
                        </li>
                        <li>Upload the CSV file</li>
                        <li>Review import progress bar</li>
                        <li>Check import results (successful/failed counts)</li>
                        <li>Review error messages if any imports failed</li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Asset Status Workflow</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">Available</Badge>
                    <span>→</span>
                    <Badge variant="default">Checked Out</Badge>
                    <span>→</span>
                    <Badge variant="outline">In Use</Badge>
                    <span>→</span>
                    <Badge variant="destructive">Maintenance</Badge>
                    <span>→</span>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Assets flow through various states during their lifecycle. Each status change is automatically logged 
                    for complete audit trail. The system tracks who made changes and when.
                  </p>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Knox ID Cleanup Utility</AlertTitle>
                  <AlertDescription>
                    Use the Knox ID cleanup feature to automatically remove Knox IDs from assets that are not 
                    currently checked out. This helps maintain data accuracy and prevents confusion.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="checkout-checkin">
              <AccordionTrigger>Checkout & Check-in Procedures</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Checking Out Assets
                    </h4>
                    <ol className="list-decimal pl-6 space-y-2 text-sm">
                      <li>Find the asset using search or browse with filters</li>
                      <li>Click the "Checkout" button</li>
                      <li>Select the user to assign to:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Search by name, username, or Knox ID</li>
                          <li>Verify user department</li>
                          <li>Check user's current assignments</li>
                        </ul>
                      </li>
                      <li>Set checkout details:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Expected return date</li>
                          <li>Purpose/project notes</li>
                          <li>Special instructions</li>
                        </ul>
                      </li>
                      <li>System automatically updates asset status</li>
                      <li>Knox ID is assigned to the asset</li>
                      <li>Activity is logged for audit trail</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Checking In Assets
                    </h4>
                    <ol className="list-decimal pl-6 space-y-2 text-sm">
                      <li>Navigate to the asset details page</li>
                      <li>Click the "Check In" button</li>
                      <li>Inspect the asset condition:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Physical condition assessment</li>
                          <li>Functionality testing</li>
                          <li>Accessory return verification</li>
                        </ul>
                      </li>
                      <li>Update asset information:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Current location</li>
                          <li>Condition notes (Good/Fair/Bad)</li>
                          <li>Required maintenance</li>
                        </ul>
                      </li>
                      <li>Set new status (Available/Maintenance)</li>
                      <li>Knox ID is cleared automatically</li>
                      <li>Generate check-in confirmation</li>
                    </ol>
                  </div>
                </div>

                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Best Practices</AlertTitle>
                  <AlertDescription>
                    Always verify asset condition during check-in. Document any issues immediately 
                    and schedule maintenance if required. The system automatically invalidates queries 
                    and refreshes data to ensure real-time accuracy across all views.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="maintenance-tracking">
              <AccordionTrigger>Maintenance & Service Tracking</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Preventive Maintenance</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Scheduling Maintenance:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Set recurring maintenance schedules</li>
                        <li>Create maintenance reminders</li>
                        <li>Assign maintenance to technicians</li>
                        <li>Track maintenance costs</li>
                        <li>Set asset status to "Maintenance"</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Maintenance Records:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Document all service activities</li>
                        <li>Record parts used and costs</li>
                        <li>Track service provider information</li>
                        <li>Maintain warranty compliance</li>
                        <li>Store maintenance history</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Reactive Maintenance</h4>
                  <ol className="list-decimal pl-6 space-y-1 text-sm">
                    <li>Report issues through the system</li>
                    <li>Set asset status to "Maintenance"</li>
                    <li>Create work order with issue details</li>
                    <li>Assign to appropriate technician</li>
                    <li>Track repair progress and costs</li>
                    <li>Update asset status upon completion</li>
                    <li>Document lessons learned</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data-management">
              <AccordionTrigger>Data Management & Export</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Export Features</h4>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li>Export filtered asset data to CSV format</li>
                    <li>Automatic filename generation with timestamp and filter info</li>
                    <li>Export includes: ID, Asset Tag, Name, Knox ID, IP/MAC addresses, Serial Number, OS Type, Status, Category, Purchase Date</li>
                    <li>Export only visible filtered data or full dataset</li>
                    <li>Notification shows count of exported items</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Delete Confirmation</h4>
                  <p className="text-sm mb-2">
                    When deleting assets, the system uses a safe delete confirmation dialog:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Shows asset name and tag for verification</li>
                    <li>Requires explicit confirmation</li>
                    <li>Prevents accidental deletions</li>
                    <li>Logs deletion in activity trail</li>
                    <li>Automatically refreshes all related views</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">Monitoring & Discovery Systems</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="vm-monitoring">
              <AccordionTrigger>Virtual Machine Monitoring (Zabbix Integration)</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Monitor className="h-4 w-4" />
                  <AlertTitle>Zabbix Integration</AlertTitle>
                  <AlertDescription>
                    SRPH-MIS integrates with Zabbix monitoring system to provide real-time VM performance data 
                    and automated alerting for critical issues. Configuration is managed through the VM Monitoring settings.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">Initial Setup</h4>
                  <ol className="list-decimal pl-6 space-y-2 text-sm">
                    <li>Navigate to Monitoring → VM Monitoring</li>
                    <li>Click the Settings tab</li>
                    <li>Configure Zabbix connection:
                      <ul className="list-disc pl-6 mt-1">
                        <li>Zabbix URL (e.g., http://107.105.168.201/zabbix)</li>
                        <li>API Key (generate from Zabbix Administration)</li>
                        <li>Auto-sync interval (recommended: 5 minutes)</li>
                        <li>Alert thresholds for CPU, memory, disk</li>
                      </ul>
                    </li>
                    <li>Test connection and verify API access</li>
                    <li>Enable automatic synchronization</li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monitoring Capabilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Real-time VM status tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          CPU utilization monitoring
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Memory usage tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Disk space monitoring
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Network performance metrics
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Automated alerting system
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Alert Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li><strong>Critical Alerts:</strong> System down, disk full</li>
                        <li><strong>Warning Alerts:</strong> High CPU, low memory</li>
                        <li><strong>Info Alerts:</strong> Maintenance windows</li>
                        <li><strong>Escalation:</strong> Auto-escalate unack'd alerts</li>
                        <li><strong>Notifications:</strong> Email, SMS, webhooks</li>
                        <li><strong>Dashboard:</strong> Visual alert status</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="network-discovery">
              <AccordionTrigger>Network Discovery & Device Inventory</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Network Scanning Process</h4>
                  <ol className="list-decimal pl-6 space-y-2 text-sm">
                    <li>Navigate to Monitoring → Network Discovery</li>
                    <li>Configure scan parameters:
                      <ul className="list-disc pl-6 mt-1">
                        <li>Target subnets (CIDR format: 192.168.1.0/24)</li>
                        <li>Port ranges to scan (default: 22,80,443,3389)</li>
                        <li>DNS servers (default: 107.105.134.9, 107.105.134.8)</li>
                        <li>Scan timeout and retry settings</li>
                      </ul>
                    </li>
                    <li>Start the discovery scan</li>
                    <li>Monitor scan progress in real-time</li>
                    <li>Review discovered devices in the dashboard</li>
                    <li>Generate inventory reports</li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Device Detection</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <ul className="space-y-1">
                        <li>• IP address and hostname</li>
                        <li>• Operating system detection</li>
                        <li>• Open ports and services</li>
                        <li>• MAC address resolution</li>
                        <li>• Device type classification</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Hardware Discovery</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <ul className="space-y-1">
                        <li>• CPU specifications</li>
                        <li>• Memory configuration</li>
                        <li>• Storage devices</li>
                        <li>• Network interfaces</li>
                        <li>• Peripheral devices</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Software Inventory</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <ul className="space-y-1">
                        <li>• Installed applications</li>
                        <li>• Service configurations</li>
                        <li>• Security software</li>
                        <li>• System updates</li>
                        <li>• License information</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Network Security Considerations</AlertTitle>
                  <AlertDescription>
                    Network discovery scans should be performed during maintenance windows when possible. 
                    Ensure proper authorization before scanning production networks. Some security systems 
                    may flag discovery activities as potential threats.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bitlocker-management">
              <AccordionTrigger>BitLocker Recovery Key Management</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Security Critical Feature</AlertTitle>
                  <AlertDescription>
                    BitLocker recovery keys provide access to encrypted drives. Access to this module 
                    is restricted to authorized security personnel only. All access attempts are logged.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium">Key Management Functions</h4>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li><strong>Key Storage:</strong> Secure centralized storage of recovery keys with encryption</li>
                    <li><strong>Asset Association:</strong> Link keys to specific devices via asset tag or serial</li>
                    <li><strong>Access Logging:</strong> Complete audit trail of all key access attempts</li>
                    <li><strong>Emergency Access:</strong> Quick key retrieval for urgent situations</li>
                    <li><strong>Search:</strong> Find keys by device name, asset tag, or user</li>
                    <li><strong>Audit Trail:</strong> Complete history of key creation and access</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Recovery Process</h4>
                  <ol className="list-decimal pl-6 space-y-1 text-sm">
                    <li>Verify user identity and authorization level</li>
                    <li>Locate device in BitLocker Keys module</li>
                    <li>Retrieve associated recovery key</li>
                    <li>Provide key to authorized user</li>
                    <li>Log key access event for audit trail</li>
                    <li>Monitor for successful recovery</li>
                    <li>Update device status if needed</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">User Management & Permissions</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="user-roles">
              <AccordionTrigger>User Roles & Account Types</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Administrator</CardTitle>
                      <Badge variant="default">Full Access</Badge>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="space-y-1">
                        <li>• Full system access and control</li>
                        <li>• User management capabilities</li>
                        <li>• System configuration access</li>
                        <li>• Database administration</li>
                        <li>• All module permissions</li>
                        <li>• Security and encryption settings</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Asset Manager</CardTitle>
                      <Badge variant="secondary">Management Access</Badge>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="space-y-1">
                        <li>• Asset lifecycle management</li>
                        <li>• Checkout/checkin operations</li>
                        <li>• Maintenance scheduling</li>
                        <li>• Department reporting</li>
                        <li>• Inventory control</li>
                        <li>• CSV import/export</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Department User</CardTitle>
                      <Badge variant="outline">Limited Access</Badge>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="space-y-1">
                        <li>• View department assets</li>
                        <li>• Request asset assignments</li>
                        <li>• Limited editing capabilities</li>
                        <li>• Self-service functions</li>
                        <li>• Department reporting</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Read-Only User</CardTitle>
                      <Badge variant="outline">View Only</Badge>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <ul className="space-y-1">
                        <li>• View-only access</li>
                        <li>• No editing capabilities</li>
                        <li>• Limited to assigned resources</li>
                        <li>• Basic reporting access</li>
                        <li>• Read system information</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="permission-system">
              <AccordionTrigger>Granular Permission System</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Permission Levels</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    The system uses three access levels for each module: View, Edit, and Add permissions. 
                    Administrators can configure these at a granular level for each user or role.
                  </p>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <p>Read-only access to module data</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li>See lists and details</li>
                          <li>Run reports</li>
                          <li>View configurations</li>
                          <li>Search and filter</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <p>Modify existing records</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li>Update information</li>
                          <li>Change status</li>
                          <li>Checkout/checkin</li>
                          <li>Edit configurations</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <p>Create new records</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li>Add new assets</li>
                          <li>Create users</li>
                          <li>Import data</li>
                          <li>Bulk operations</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <UserCog className="h-4 w-4" />
                  <AlertTitle>Best Practice</AlertTitle>
                  <AlertDescription>
                    Follow the principle of least privilege: grant users only the minimum permissions 
                    required for their role. Regularly review and audit user permissions through the 
                    User Permissions module.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="activity-tracking">
              <AccordionTrigger>Activity Tracking & Audit Logs</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Logged Activities</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">User Actions:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Login/logout events</li>
                        <li>Asset checkout/checkin</li>
                        <li>Record creation/modification/deletion</li>
                        <li>Permission changes</li>
                        <li>Search queries</li>
                        <li>Export operations</li>
                        <li>Import operations</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">System Events:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Database operations</li>
                        <li>Backup/restore activities</li>
                        <li>Configuration changes</li>
                        <li>Error conditions</li>
                        <li>Security incidents</li>
                        <li>API access attempts</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Audit Trail Features</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Immutable activity logs with complete data integrity</li>
                    <li>Detailed timestamps and user identification</li>
                    <li>Before/after values for all changes</li>
                    <li>Filterable and searchable audit history</li>
                    <li>Export capabilities for compliance reporting</li>
                    <li>Automated retention policies</li>
                    <li>Real-time activity feed on dashboard</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Cog className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">System Administration</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="database-management">
              <AccordionTrigger>Database Management & Backup</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Critical Operations</AlertTitle>
                  <AlertDescription>
                    Database operations can affect system availability. Always create backups before 
                    performing maintenance and schedule operations during low-usage periods.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Backup Operations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Manual Backup:</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm">
                          <li>Navigate to Admin → Database</li>
                          <li>Click "Create Backup" button</li>
                          <li>Enter backup description</li>
                          <li>Backup is automatically saved to /backups directory</li>
                          <li>Monitor backup progress</li>
                          <li>Verify backup completion and file size</li>
                        </ol>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Automated Backups:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Daily automatic backups at configured time</li>
                          <li>Configurable retention period</li>
                          <li>Email notifications on failure</li>
                          <li>Backup integrity verification</li>
                          <li>Backup history tracking</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Maintenance Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Regular Maintenance:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Database optimization</li>
                          <li>Index rebuilding</li>
                          <li>Statistics updates</li>
                          <li>Cleanup of old logs</li>
                          <li>Performance monitoring</li>
                          <li>Query optimization</li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Emergency Procedures:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Database restoration from backup</li>
                          <li>Corruption recovery</li>
                          <li>Emergency access procedures</li>
                          <li>Disaster recovery protocols</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="system-configuration">
              <AccordionTrigger>System Configuration & Settings</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>General Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="space-y-2 text-sm">
                        <li><strong>Site Information:</strong> Company name, logo, contact details</li>
                        <li><strong>Localization:</strong> Timezone, date format, currency</li>
                        <li><strong>Asset Settings:</strong> Tag format, categories, statuses</li>
                        <li><strong>Notifications:</strong> Email templates, alert thresholds</li>
                        <li><strong>Integration:</strong> API keys, external service configs</li>
                        <li><strong>Display Options:</strong> Default page sizes, theme settings</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Security Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="space-y-2 text-sm">
                        <li><strong>Password Policy:</strong> Complexity, expiration, history</li>
                        <li><strong>Session Management:</strong> Timeout, concurrent sessions</li>
                        <li><strong>Access Control:</strong> IP restrictions, rate limiting</li>
                        <li><strong>Audit Settings:</strong> Log retention, compliance reporting</li>
                        <li><strong>Encryption:</strong> Data-at-rest encryption for sensitive fields</li>
                        <li><strong>Authentication:</strong> Session security, cookie settings</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Data Encryption</AlertTitle>
                  <AlertDescription>
                    The system supports data encryption for sensitive fields including serial numbers, 
                    IP addresses, MAC addresses, and BitLocker keys. Configure encryption settings in 
                    the Admin → Data Encryption module.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reporting-analytics">
              <AccordionTrigger>Reporting & Analytics</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Available Report Types</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart className="h-4 w-4" />
                          Inventory Reports
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1">
                        <ul className="list-disc pl-4">
                          <li>Asset inventory summary</li>
                          <li>Assets by department</li>
                          <li>Assets by status</li>
                          <li>Asset valuation report</li>
                          <li>Warranty expiration</li>
                          <li>Maintenance schedules</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Usage Reports
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1">
                        <ul className="list-disc pl-4">
                          <li>Asset utilization rates</li>
                          <li>Checkout history</li>
                          <li>User activity summary</li>
                          <li>License compliance</li>
                          <li>VM usage analytics</li>
                          <li>Network device inventory</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Compliance Reports
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1">
                        <ul className="list-disc pl-4">
                          <li>Audit trail summaries</li>
                          <li>Security compliance</li>
                          <li>Change management</li>
                          <li>Asset lifecycle</li>
                          <li>Regulatory compliance</li>
                          <li>Access control reports</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Report Generation</h4>
                  <ol className="list-decimal pl-6 space-y-1 text-sm">
                    <li>Navigate to Reports section</li>
                    <li>Select report type and template</li>
                    <li>Configure parameters and filters</li>
                    <li>Choose output format (PDF, Excel, CSV)</li>
                    <li>Schedule for recurring generation (optional)</li>
                    <li>Generate and download report</li>
                    <li>Reports are automatically timestamped</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting" className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <LifeBuoy className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-semibold">Troubleshooting & Support</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="common-issues">
              <AccordionTrigger>Common Issues & Solutions</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Login & Authentication
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-red-600">Problem: Can't log in</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs mt-1">
                          <li>Verify username/password spelling</li>
                          <li>Check Caps Lock status</li>
                          <li>Clear browser cache and cookies</li>
                          <li>Try different browser or incognito mode</li>
                          <li>Contact admin if account is locked</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-red-600">Problem: Session expires quickly</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs mt-1">
                          <li>Check system timeout settings</li>
                          <li>Ensure cookies are enabled</li>
                          <li>Avoid opening multiple tabs</li>
                          <li>Contact admin to adjust session length</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Data & Display Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-red-600">Problem: Missing assets/data</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs mt-1">
                          <li>Check applied filters and search terms</li>
                          <li>Click "Clear Filters" button</li>
                          <li>Verify permissions for data access</li>
                          <li>Try refreshing the page (F5)</li>
                          <li>Check if items are archived or deleted</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-red-600">Problem: Slow performance</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs mt-1">
                          <li>Check internet connection speed</li>
                          <li>Clear browser cache</li>
                          <li>Reduce page size to 10-20 items</li>
                          <li>Close unnecessary browser tabs</li>
                          <li>Contact admin about server performance</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        Import/Export Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-red-600">Problem: CSV import fails</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs mt-1">
                          <li>Ensure CSV format matches template</li>
                          <li>Check for required fields</li>
                          <li>Verify date formats are correct</li>
                          <li>Remove special characters from data</li>
                          <li>Check import results for error details</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-red-600">Problem: Export shows no data</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs mt-1">
                          <li>Verify filters allow some data</li>
                          <li>Check if search term is too restrictive</li>
                          <li>Clear all filters and try again</li>
                          <li>Ensure you have view permissions</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-purple-500" />
                        Browser Compatibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium mb-2">Recommended Browsers:</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs">
                          <li>Google Chrome (version 90+)</li>
                          <li>Mozilla Firefox (version 88+)</li>
                          <li>Microsoft Edge (version 90+)</li>
                          <li>Safari (version 14+)</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium mb-2">Not Supported:</p>
                        <ul className="list-disc pl-6 space-y-1 text-xs">
                          <li>Internet Explorer (upgrade to Edge)</li>
                          <li>Very old browser versions</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact-support">
              <AccordionTrigger>Getting Help & Support</AccordionTrigger>
              <AccordionContent className="space-y-6">
                <div className="rounded-md border p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <div className="flex items-start">
                    <div className="mr-4">
                      <LifeBuoy className="h-12 w-12 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Primary Support Contact</h3>
                      <div className="space-y-2">
                        <p className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="font-medium">Nikkel Jimenez</span>
                          <span className="ml-2 text-muted-foreground">(Knox ID: jimenez.n)</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          System Developer & Administrator
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        When to Contact Support
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <ul className="space-y-1">
                        <li>• System errors or unexpected behavior</li>
                        <li>• Permission or access issues</li>
                        <li>• Data integrity concerns</li>
                        <li>• Performance problems</li>
                        <li>• Feature requests or enhancements</li>
                        <li>• Training or user guidance needs</li>
                        <li>• Import/Export issues</li>
                        <li>• Integration problems (Zabbix, JIRA)</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Support Request Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="font-medium mb-2">Include in your request:</p>
                      <ul className="space-y-1">
                        <li>• Detailed description of the issue</li>
                        <li>• Steps to reproduce the problem</li>
                        <li>• Screenshots or error messages</li>
                        <li>• Browser and OS information</li>
                        <li>• Your username and department</li>
                        <li>• Urgency level and business impact</li>
                        <li>• What you've already tried</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Support Response Times</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1 text-sm">
                      <div><strong>Critical Issues:</strong> 2-4 hours (system down, security breaches, data loss)</div>
                      <div><strong>High Priority:</strong> 8-24 hours (significant functionality impacted)</div>
                      <div><strong>Medium Priority:</strong> 1-3 business days (minor issues, enhancement requests)</div>
                      <div><strong>Low Priority:</strong> 3-5 business days (documentation, training, suggestions)</div>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Emergency Contact</AlertTitle>
                  <AlertDescription>
                    For critical system failures outside business hours that affect business operations, 
                    contact Nikkel Jimenez directly. Include "SRPH-MIS EMERGENCY" in your message subject. 
                    Emergency support is available 24/7 for system-down situations.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      <div className="mt-12 border-t pt-8">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Thank you for using SRPH-MIS!</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This manual is continuously updated to reflect new features and improvements. 
            If you have suggestions for additional documentation or notice any inaccuracies, 
            please contact our support team.
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Badge variant="outline" className="px-3 py-1">Version 2.0</Badge>
            <Badge variant="outline" className="px-3 py-1">Last Updated: January 2025</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
