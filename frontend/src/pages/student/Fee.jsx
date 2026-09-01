// src/pages/student/Fee.jsx
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { Spinner, PageTitle } from '../../components/Shared'
import FeeDetails from '../../components/Shared/FeeDetails'

export default function StudentFee() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-fee'],
    queryFn: () => studentApi.getFee().then(r => r.data)
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <PageTitle title="My Fee Status"/>
      <FeeDetails fee={data?.data} />
    </div>
  )
}
