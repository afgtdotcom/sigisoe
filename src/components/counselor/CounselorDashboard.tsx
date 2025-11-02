import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Users, CheckCircle, Clock, Calendar, TrendingUp } from 'lucide-react';

interface CounselingRequest {
  id: string;
  reason: string;
  message?: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  requested_at: string;
  student?: {
    name: string;
    student_id: string;
    class: string;
  };
}

const CounselorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CounselingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    activeRequests: 0,
    completedRequests: 0
  });

  useEffect(() => {
    loadCounselingRequests();
  }, [user]);

  const loadCounselingRequests = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('counseling_requests')
        .select(`
          *,
          student:users!student_id(name, student_id, class)
        `)
        .eq('counselor_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      
      const requestsData = data || [];
      setRequests(requestsData);
      
      setStats({
        totalRequests: requestsData.length,
        pendingRequests: requestsData.filter(r => r.status === 'pending').length,
        activeRequests: requestsData.filter(r => r.status === 'accepted').length,
        completedRequests: requestsData.filter(r => r.status === 'completed').length
      });
    } catch (error) {
      console.error('Error loading counseling requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accept' | 'complete') => {
    try {
      const updateData: any = {
        status: action === 'accept' ? 'accepted' : 'completed'
      };

      if (action === 'complete') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('counseling_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      await loadCounselingRequests();
      alert(`Request ${action}ed successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`Failed to ${action} request. Please try again.`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'accepted': 'bg-blue-100 text-blue-800 border-blue-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      'pending': Clock,
      'accepted': MessageCircle,
      'completed': CheckCircle,
      'cancelled': Clock
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">{getWelcomeMessage()}</h1>
        <p className="text-green-100 mt-2">Counselor Dashboard - Help students achieve their best</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalRequests}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-3xl font-bold text-blue-900">{stats.activeRequests}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-900">{stats.completedRequests}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Counseling Requests</h3>
        </div>
        
        <div className="p-6">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No counseling requests</p>
              <p className="text-gray-400 text-sm">Requests from students will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.slice(0, 5).map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{request.reason}</h4>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      {request.message && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{request.message}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>
                          {request.student?.name} ({request.student?.student_id}) - Class {request.student?.class}
                        </span>
                        <span>{formatDate(request.requested_at)}</span>
                      </div>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleRequestAction(request.id, 'accept')}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  )}

                  {request.status === 'accepted' && (
                    <div className="flex space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleRequestAction(request.id, 'complete')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        Mark Complete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">My Students</h3>
          <p className="text-gray-600 text-sm mb-4">View all students assigned to you</p>
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            View Students
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <Calendar className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule</h3>
          <p className="text-gray-600 text-sm mb-4">Manage your counseling schedule</p>
          <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
            View Schedule
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
          <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
          <p className="text-gray-600 text-sm mb-4">Generate counseling reports</p>
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default CounselorDashboard;