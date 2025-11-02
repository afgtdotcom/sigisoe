import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Library, BookOpen, Users, Clock, CheckCircle, AlertTriangle, TrendingUp, Plus } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  total_copies: number;
  available_copies: number;
}

interface BookIssue {
  id: string;
  status: 'requested' | 'issued' | 'returned' | 'overdue';
  issued_date: string;
  due_date: string;
  book?: Book;
  student?: {
    name: string;
    student_id: string;
    class: string;
  };
}

const LibrarianDashboard: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    try {
      const [booksRes, issuesRes] = await Promise.all([
        supabase.from('books').select('*').order('title', { ascending: true }),
        supabase.from('book_issues').select(`
          *,
          book:books(*),
          student:users!student_id(name, student_id, class)
        `).order('issued_date', { ascending: false })
      ]);

      if (booksRes.error) throw booksRes.error;
      if (issuesRes.error) throw issuesRes.error;

      const booksData = booksRes.data || [];
      const issuesData = issuesRes.data || [];

      setBooks(booksData);
      setBookIssues(issuesData);

      const totalBooks = booksData.reduce((sum, book) => sum + book.total_copies, 0);
      const availableBooks = booksData.reduce((sum, book) => sum + book.available_copies, 0);
      const issuedBooks = issuesData.filter(issue => issue.status === 'issued').length;
      const overdueBooks = issuesData.filter(issue => issue.status === 'overdue').length;
      const pendingRequests = issuesData.filter(issue => issue.status === 'requested').length;

      setStats({
        totalBooks,
        availableBooks,
        issuedBooks,
        overdueBooks,
        pendingRequests
      });
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAction = async (issueId: string, action: 'approve' | 'return') => {
    try {
      const updateData: any = {};
      
      if (action === 'approve') {
        updateData.status = 'issued';
        updateData.issued_by = user?.id;
      } else if (action === 'return') {
        updateData.status = 'returned';
        updateData.return_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('book_issues')
        .update(updateData)
        .eq('id', issueId);

      if (error) throw error;

      // Update book availability
      if (action === 'approve') {
        const issue = bookIssues.find(i => i.id === issueId);
        if (issue?.book) {
          await supabase
            .from('books')
            .update({ available_copies: issue.book.available_copies - 1 })
            .eq('id', issue.book.id);
        }
      } else if (action === 'return') {
        const issue = bookIssues.find(i => i.id === issueId);
        if (issue?.book) {
          await supabase
            .from('books')
            .update({ available_copies: issue.book.available_copies + 1 })
            .eq('id', issue.book.id);
        }
      }

      await loadLibraryData();
      alert(`Book ${action === 'approve' ? 'issued' : 'returned'} successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing book:`, error);
      alert(`Failed to ${action} book. Please try again.`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'requested': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'issued': 'bg-blue-100 text-blue-800 border-blue-200',
      'returned': 'bg-green-100 text-green-800 border-green-200',
      'overdue': 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      'requested': Clock,
      'issued': BookOpen,
      'returned': CheckCircle,
      'overdue': AlertTriangle
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    return `${greeting}, ${user?.name}!`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">{getWelcomeMessage()}</h1>
        <p className="text-indigo-100 mt-2">Library Management Dashboard - LibAbra Manage</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Books</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalBooks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Library className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-3xl font-bold text-green-900">{stats.availableBooks}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Issued</p>
              <p className="text-3xl font-bold text-blue-900">{stats.issuedBooks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-900">{stats.overdueBooks}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Requests</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Book Issues */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Book Issues</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookIssues.slice(0, 10).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No book issues found</p>
                  </td>
                </tr>
              ) : (
                bookIssues.slice(0, 10).map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {issue.book?.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          by {issue.book?.author}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {issue.student?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {issue.student?.student_id} • Class {issue.student?.class}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(issue.issued_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(issue.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(issue.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {issue.status === 'requested' && (
                          <button
                            onClick={() => handleIssueAction(issue.id, 'approve')}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Approve
                          </button>
                        )}
                        {issue.status === 'issued' && (
                          <button
                            onClick={() => handleIssueAction(issue.id, 'return')}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <Plus className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Book</h3>
          <p className="text-gray-600 text-sm mb-4">Add new books to the library</p>
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Add Book
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Issues</h3>
          <p className="text-gray-600 text-sm mb-4">Handle book issue requests</p>
          <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
            View Issues
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Students</h3>
          <p className="text-gray-600 text-sm mb-4">View student library activity</p>
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
            View Students
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <TrendingUp className="w-12 h-12 text-orange-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
          <p className="text-gray-600 text-sm mb-4">Generate library reports</p>
          <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default LibrarianDashboard;