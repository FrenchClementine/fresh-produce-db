import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCertifications() {
  const { data: certifications, isLoading, error } = useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certifications')
        .select('id, name, description')
        .order('name')

      if (error) {
        console.error('Error fetching certifications:', error)
        throw error
      }

      return data
    }
  })

  return { certifications, isLoading, error }
}
