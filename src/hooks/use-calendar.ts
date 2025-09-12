import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCalendar() {
  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_seasonal_calendar')
        .select('*')
        .order('start_date')
      
      if (error) throw error
      return data
    },
  })

  return { calendarData, isLoading, error }
}
