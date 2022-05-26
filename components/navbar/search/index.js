import { useRouter } from 'next/router'
import { useState, useRef } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiSearch } from 'react-icons/fi'

import { ens as getEns, domainFromEns } from '../../../lib/api/ens'
import { transfers } from '../../../lib/api/index'
import { type } from '../../../lib/object/id'
import { equals_ignore_case } from '../../../lib/utils'
import { ENS_DATA } from '../../../reducers/types'

export default = () => {
  const dispatch = useDispatch()
  const { ens } = useSelector(state => ({ ens: state.ens }), shallowEqual)
  const { ens_data } = { ...ens }

  const router = useRouter()
  const { query } = { ...router }
  const { address, tx } = { ...query }

  const [inputSearch, setInputSearch] = useState('')

  const inputSearchRef = useRef()
  const { handleSubmit } = useForm()

  const onSubmit = async () => {
    let input = inputSearch, input_type = type(input)
    if (input_type) {
      if (Object.values({ ...ens_data }).findIndex(v => equals_ignore_case(v?.name, input)) > -1) {
        input = Object.values(ens_data).find(v => equals_ignore_case(v?.name, input))?.resolvedAddress?.id
        input_type = 'address'
      }
      else if (input_type === 'ens') {
        const domain = await domainFromEns(input, ens_data)
        if (domain?.resolvedAddress?.id) {
          input = domain.resolvedAddress.id
          dispatch({
            type: ENS_DATA,
            value: { [`${input.toLowerCase()}`]: domain },
          })
        }
        input_type = 'address'
      }
      else if (['evm_address', 'cosmos_address'].includes(input_type)) {
        input_type = 'address'
      }
      else if (['evm_tx', 'tx'].includes(input_type)) {
        const response = await transfers({
          query: {
            match: { 'source.id': input },
          },
        })
        if (response?.data?.[0]) {
          input_type = 'transfer'
        }
        else if (input_type === 'evm_tx') {
          input_type = 'gmp'
        }
      }
      if (input_type === 'address') {
        const addresses = [input?.toLowerCase()].filter(a => a && !ens_data?.[a])
        const ens_data = await getEns(addresses)
        if (ens_data) {
          dispatch({
            type: ENS_DATA,
            value: ens_data,
          })
        }
      }
      router.push(`/${input_type}/${input}`)
      setInputSearch('')
      inputSearchRef?.current?.blur()
    }
  }

  const canSearch = inputSearch && [address, tx].filter(s => s).findIndex(s => equals_ignore_case(s, inputSearch)) < 0

  return (
    <div className="navbar-search mr-2 sm:mx-3">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="relative">
          <input
            ref={inputSearchRef}
            type="search"
            placeholder="Search by TxHash / Address / Block / ENS"
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value?.trim())}
            className={`w-52 sm:w-80 h-10 appearance-none focus:ring-0 rounded-lg text-xs sm:text-sm pl-3 ${canSearch ? 'pr-10' : 'pr-3'}`}
          />
          {canSearch && (
            <button
              onClick={() => onSubmit()}
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-500 dark:hover:bg-blue-600 absolute rounded-lg text-white right-0 p-1.5 mt-1.5 mr-2"
            >
              <FiSearch size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}