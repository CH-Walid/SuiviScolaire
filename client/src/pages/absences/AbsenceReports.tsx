import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ABSENCE_STATUSES, getStatusOption } from "@/lib/constants";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

// Types
interface Course {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  absenceThreshold?: number;
}

interface Department {
  id: number;
  name: string;
}

interface Module {
  id: number;
  name: string;
  code: string;
  courseId: number;
}

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  courseId: number;
}

interface Absence {
  id: number;
  sessionId: number;
  studentId: number;
  status: string;
  notes: string | null;
}

interface Session {
  id: number;
  date: string;
  type: string;
  moduleElementId: number;
  teacherId: number;
  groupId: number | null;
  notes: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AbsenceReports() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false);
  const [selectedCourseForThreshold, setSelectedCourseForThreshold] = useState<Course | null>(null);

  // Queries for fetching data
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  const { data: absences } = useQuery<Absence[]>({
    queryKey: ['/api/absences'],
  });

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
  });

  // Filter courses based on selected department
  const filteredCourses = courses?.filter(
    course => selectedDepartment === "all" || course.departmentId.toString() === selectedDepartment
  ) || [];

  // Filter students based on selected course
  const filteredStudents = students?.filter(
    student => selectedCourse === "all" || student.courseId.toString() === selectedCourse
  ) || [];

  // Search students based on search term
  const searchedStudents = filteredStudents.filter(
    student => 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get course name by ID
  const getCourseName = (id: number) => {
    const course = courses?.find(c => c.id === id);
    return course ? course.name : "Filière inconnue";
  };

  // Calculate absence count for each student
  const getStudentAbsences = (studentId: number) => {
    return absences?.filter(
      absence => absence.studentId === studentId && absence.status === ABSENCE_STATUSES.ABSENT
    ).length || 0;
  };

  // Calculate highest absence count
  const highestAbsenceCount = Math.max(
    ...filteredStudents.map(student => getStudentAbsences(student.id))
  );

  // Get top absentees (students with most absences)
  const topAbsentees = [...filteredStudents]
    .sort((a, b) => getStudentAbsences(b.id) - getStudentAbsences(a.id))
    .slice(0, 5);

  // Prepare data for absences by course chart
  const absencesByCourseData = courses?.map(course => {
    const courseStudents = students?.filter(s => s.courseId === course.id) || [];
    const studentIds = courseStudents.map(s => s.id);
    
    const absenceCount = absences?.filter(
      a => studentIds.includes(a.studentId) && a.status === ABSENCE_STATUSES.ABSENT
    ).length || 0;
    
    return {
      name: course.code,
      absences: absenceCount,
      students: courseStudents.length,
      ratio: courseStudents.length > 0 ? (absenceCount / courseStudents.length).toFixed(2) : "0"
    };
  }) || [];

  // Prepare data for absences by date chart
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const absencesByDateData = daysInMonth.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const daySessions = sessions?.filter(s => format(new Date(s.date), "yyyy-MM-dd") === dayStr) || [];
    const sessionIds = daySessions.map(s => s.id);
    
    const absenceCount = absences?.filter(
      a => sessionIds.includes(a.sessionId) && a.status === ABSENCE_STATUSES.ABSENT
    ).length || 0;
    
    return {
      name: format(day, "dd/MM"),
      absences: absenceCount
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Rapports d'absences</h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Select 
            value={selectedDepartment} 
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger>
              <SelectValue placeholder="Département" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments?.map((department) => (
                <SelectItem key={department.id} value={department.id.toString()}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select 
            value={selectedCourse} 
            onValueChange={setSelectedCourse}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filière" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les filières</SelectItem>
              {filteredCourses.map((course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.name} ({course.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select 
            value={selectedPeriod} 
            onValueChange={setSelectedPeriod}
          >
            <SelectTrigger>
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="month">Mois courant</SelectItem>
              <SelectItem value="semester">Semestre courant</SelectItem>
              <SelectItem value="year">Année courante</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Input
            placeholder="Rechercher un étudiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Absences by Course Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Absences par filière</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={absencesByCourseData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="absences" fill="#8884d8" name="Absences" />
                <Bar dataKey="students" fill="#82ca9d" name="Étudiants" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Absences by Date Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendance des absences (mois courant)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={absencesByDateData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="absences" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                  name="Absences"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Absentees */}
      <Card>
        <CardHeader>
          <CardTitle>Top des absences</CardTitle>
          <CardDescription>
            Étudiants avec le plus grand nombre d'absences
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topAbsentees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Rang
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Étudiant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Filière
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Nombre d'absences
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {topAbsentees.map((student, index) => {
                    const absenceCount = getStudentAbsences(student.id);
                    return (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-medium text-white ${
                              index === 0 ? "bg-yellow-500" : 
                              index === 1 ? "bg-gray-400" : 
                              index === 2 ? "bg-amber-800" : 
                              "bg-neutral-300"
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-neutral-900">
                                {student.lastName} {student.firstName}
                              </div>
                              <div className="text-sm text-neutral-500">
                                {student.studentId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                            {getCourseName(student.courseId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-semibold ${
                            absenceCount > 10 ? "text-red-600" : 
                            absenceCount > 5 ? "text-amber-600" : 
                            "text-neutral-900"
                          }`}>
                            {absenceCount}
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full ${
                                absenceCount > 10 ? "bg-red-600" : 
                                absenceCount > 5 ? "bg-amber-600" : 
                                "bg-blue-600"
                              }`} 
                              style={{ 
                                width: `${highestAbsenceCount > 0 ? (absenceCount / highestAbsenceCount) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500">
              Aucune donnée d'absence disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Absence List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des étudiants</CardTitle>
          <CardDescription>
            Rapport détaillé des absences par étudiant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchedStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Nom complet
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Filière
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Absences
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {searchedStudents.map((student) => {
                    const absenceCount = getStudentAbsences(student.id);
                    return (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {student.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-neutral-900">
                            {student.lastName} {student.firstName}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {student.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                            {getCourseName(student.courseId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            absenceCount > 10 ? "bg-red-100 text-red-800" : 
                            absenceCount > 5 ? "bg-amber-100 text-amber-800" : 
                            absenceCount > 0 ? "bg-blue-100 text-blue-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {absenceCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="outline" size="sm">
                            <span className="material-icons text-sm mr-1">visibility</span>
                            Détails
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500">
              {searchTerm 
                ? "Aucun étudiant ne correspond à votre recherche."
                : "Aucun étudiant disponible avec les filtres sélectionnés."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Seuils d'absences</CardTitle>
            <CardDescription>
              Gérer les seuils d'absences par filière et identifier les étudiants dépassant ces seuils
            </CardDescription>
          </div>
          <Button 
            variant="outline"
            onClick={() => {
              if (courses?.length) {
                setSelectedCourseForThreshold(courses[0]);
                setIsThresholdDialogOpen(true);
              }
            }}
          >
            Configurer les seuils
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses?.map(course => {
                if (!course.absenceThreshold) return null;
                
                const courseStudents = students?.filter(s => s.courseId === course.id) || [];
                const studentsExceedingThreshold = courseStudents.filter(student => 
                  getStudentAbsences(student.id) > (course.absenceThreshold || 3)
                );
                
                return (
                  <Card key={course.id} className={studentsExceedingThreshold.length > 0 ? "border-red-300" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{course.name} ({course.code})</CardTitle>
                      <CardDescription>
                        Seuil: {course.absenceThreshold} absences
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentsExceedingThreshold.length > 0 ? (
                        <div>
                          <p className="text-sm text-red-600 font-medium mb-2">
                            {studentsExceedingThreshold.length} étudiant(s) dépassent le seuil d'absences
                          </p>
                          <div className="max-h-40 overflow-y-auto">
                            <table className="min-w-full divide-y divide-neutral-200">
                              <thead className="bg-neutral-50">
                                <tr>
                                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Étudiant
                                  </th>
                                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                    Absences
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-neutral-200">
                                {studentsExceedingThreshold.map(student => (
                                  <tr key={student.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      {student.lastName} {student.firstName}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-red-600">
                                      {getStudentAbsences(student.id)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-green-600">
                          Aucun étudiant ne dépasse le seuil d'absences.
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedCourseForThreshold(course);
                          setIsThresholdDialogOpen(true);
                        }}
                      >
                        Modifier le seuil
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Configuration Dialog */}
      <Dialog open={isThresholdDialogOpen} onOpenChange={setIsThresholdDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer le seuil d'absences</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedCourseForThreshold && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Filière</h3>
                  <p>{selectedCourseForThreshold.name} ({selectedCourseForThreshold.code})</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Seuil d'absences</h3>
                  <p className="text-sm text-muted-foreground">
                    Les étudiants dépassant ce nombre d'absences seront signalés pour action.
                  </p>
                  <Input 
                    type="number" 
                    min="1" 
                    max="20"
                    defaultValue={selectedCourseForThreshold.absenceThreshold || 3}
                    onChange={(e) => {
                      if (selectedCourseForThreshold) {
                        selectedCourseForThreshold.absenceThreshold = parseInt(e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsThresholdDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={() => {
                // In a real implementation, we would save the threshold to the database here
                setIsThresholdDialogOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
