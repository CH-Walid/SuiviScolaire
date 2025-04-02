import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Pie, PieChart, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  Users, BookOpen, User, AlertCircle, 
  Activity, Calendar, FileBarChart, GraduationCap,
  Clock, BarChart3, PieChart as PieChartIcon
} from "lucide-react";

// Types for our statistics
interface Statistics {
  studentsCount: number;
  departmentsCount: number;
  coursesCount: number;
  teachersCount: number;
  modulesCount: number;
  absencesCount: number;
}

interface TopAbsentee {
  studentId: number;
  studentName: string;
  absenceCount: number;
}

interface RecentActivity {
  sessionId: number;
  date: string;
  teacherName: string;
  moduleElementName: string;
  type: string;
  absencesCount: number;
}

const departmentAbsenceData = [
  { name: 'Informatique', absences: 142 },
  { name: 'Mathématiques', absences: 89 },
  { name: 'Physique', absences: 65 },
  { name: 'Génie Civil', absences: 96 },
  { name: 'Biologie', absences: 78 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const { user } = useAuth();
  const [chartWidth, setChartWidth] = useState(600);

  // Fetch statistics data
  const { data: statistics, isLoading: statsLoading } = useQuery<Statistics>({
    queryKey: ['/api/statistics'],
  });

  // Fetch top absentees
  const { data: topAbsentees, isLoading: topAbsenteesLoading } = useQuery<TopAbsentee[]>({
    queryKey: ['/api/statistics/top-absentees'],
  });

  // Fetch recent activities
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
    queryKey: ['/api/statistics/recent-activities'],
  });

  // Update chart width on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setChartWidth(window.innerWidth - 50);
      } else if (window.innerWidth < 1024) {
        setChartWidth(window.innerWidth - 200);
      } else {
        setChartWidth(Math.min(window.innerWidth - 400, 800));
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get relative time string
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-muted p-3 mr-4">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Étudiants</p>
              <p className="text-2xl font-semibold">
                {statsLoading ? '...' : statistics?.studentsCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-muted p-3 mr-4">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Filières</p>
              <p className="text-2xl font-semibold">
                {statsLoading ? '...' : statistics?.coursesCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-muted p-3 mr-4">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Enseignants</p>
              <p className="text-2xl font-semibold">
                {statsLoading ? '...' : statistics?.teachersCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-muted p-3 mr-4">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Absences (total)</p>
              <p className="text-2xl font-semibold">
                {statsLoading ? '...' : statistics?.absencesCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Activités récentes</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Statistiques</span>
          </TabsTrigger>
          <TabsTrigger value="absentees" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>Top absences</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Recent Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>
                Dernières activités d'enregistrement des absences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activitiesLoading ? (
                  <div className="flex justify-center py-8">
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : recentActivities && recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 rounded-full bg-muted p-2">
                        {activity.type === 'course' ? (
                          <BookOpen className="h-4 w-4 text-primary" />
                        ) : activity.type === 'TD' ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="font-medium">
                          {activity.absencesCount > 0 ? 'Absences enregistrées' : 'Séance créée'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {`${activity.teacherName} a enregistré ${activity.absencesCount} absence${
                            activity.absencesCount !== 1 ? 's' : ''
                          } dans le module "${activity.moduleElementName}"`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1 inline" />
                          {getRelativeTime(activity.date)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune activité récente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Charts Tab */}
        <TabsContent value="charts">
          <Card>
            <CardHeader>
              <CardTitle>Absences par département</CardTitle>
              <CardDescription>
                Distribution des absences à travers les différents départements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentAbsenceData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: '#888' }} />
                    <YAxis tick={{ fill: '#888' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #f0f0f0',
                        borderRadius: '6px'
                      }} 
                    />
                    <Bar dataKey="absences" fill="hsl(220, 60%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Top Absentees Tab */}
        <TabsContent value="absentees">
          <Card>
            <CardHeader>
              <CardTitle>Étudiants avec le plus d'absences</CardTitle>
              <CardDescription>
                Liste des étudiants ayant accumulé le plus d'absences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topAbsenteesLoading ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : topAbsentees && topAbsentees.length > 0 ? (
                <ul className="space-y-4">
                  {topAbsentees.map((student, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {student.studentName.split(' ').map(name => name[0]).join('')}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-muted-foreground">ID: {student.studentId}</p>
                        </div>
                      </div>
                      <div className={`${
                        student.absenceCount > 10 ? 'bg-destructive/10 text-destructive' : 
                        student.absenceCount > 5 ? 'bg-amber-100 text-amber-700' : 
                        'bg-primary/10 text-primary'
                      } px-2.5 py-1 rounded-md text-sm font-medium`}>
                        {student.absenceCount}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune donnée d'absence
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
