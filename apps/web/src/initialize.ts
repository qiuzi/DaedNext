import { useCallback } from 'react'

import { getInterfacesRequest, useEnsureDefaultResourcesMutation } from '~/apis'
import {
  DEFAULT_CONFIG_NAME,
  DEFAULT_CONFIG_WITH_LAN_INTERFACEs,
  DEFAULT_DNS,
  DEFAULT_DNS_NAME,
  DEFAULT_ROUTING,
  DEFAULT_ROUTING_NAME,
  MODE,
} from '~/constants'
import { useAPIClient } from '~/contexts'
import { isMockMode, MOCK_DEFAULT_IDS } from '~/mocks'
import { defaultResourcesAtom, modeAtom } from '~/store'
import { hasDefaultRoutes } from '~/utils/interfaces'

export function useInitialize() {
  const ensureDefaultResourcesMutation = useEnsureDefaultResourcesMutation()
  const apiClient = useAPIClient()
  const getInterfaces = getInterfacesRequest(apiClient)

  return useCallback(async () => {
    if (isMockMode()) {
      modeAtom.set(MODE.rule)
      defaultResourcesAtom.set(MOCK_DEFAULT_IDS)
      return
    }

    const allIfaces = (await getInterfaces()).general.interfaces
    const names = allIfaces.map(({ name }) => name)

    const lanInterfaces = names.includes('br-lan')
      ? ['br-lan']
      : allIfaces
          .filter((iface) => !hasDefaultRoutes(iface))
          .map(({ name }) => name)
          .filter((name) => name !== 'lo' && !name.startsWith('docker') && !name.startsWith('veth'))

    const { defaultConfigID, defaultDNSID, defaultGroupID, defaultRoutingID, mode } =
      await ensureDefaultResourcesMutation.mutateAsync({
        configName: DEFAULT_CONFIG_NAME,
        global: DEFAULT_CONFIG_WITH_LAN_INTERFACEs(lanInterfaces),
        dnsName: DEFAULT_DNS_NAME,
        dns: DEFAULT_DNS,
        routingName: DEFAULT_ROUTING_NAME,
        routing: DEFAULT_ROUTING,
        mode: MODE.simple,
      })

    modeAtom.set(mode as MODE)
    defaultResourcesAtom.set({ defaultConfigID, defaultDNSID, defaultGroupID, defaultRoutingID })
  }, [ensureDefaultResourcesMutation, getInterfaces])
}
