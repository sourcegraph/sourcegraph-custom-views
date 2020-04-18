import * as sourcegraph from 'sourcegraph'
import { map } from 'rxjs/operators'
import { getData } from './data'

const VIEW_ID = 'org'

export function activate(ctx: sourcegraph.ExtensionContext): void {
    ctx.subscriptions.add(
        sourcegraph.app.registerViewProvider(VIEW_ID, {
            provideView: params => {
                const org = params['extraPath'] ? params.extraPath.replace(/^\//, '') : null
                if (org === null) {
                    throw new Error('no view specified')
                }
                return getData(org).pipe(
                    map(data => {
                        const implicitQueryPrefix =
                            data.githubOrgs.length === 0
                                ? ''
                                : data.githubOrgs.length === 1
                                ? `repo:${data.githubOrgs[0]}/`
                                : `repo:(${data.githubOrgs.join('|')})/`
                        const view: sourcegraph.View = {
                            title: data.title,
                            content: [
                                {
                                    kind: sourcegraph.MarkupKind.Markdown,
                                    value: data.summary,
                                },
                                { component: 'QueryInput', props: { implicitQueryPrefix } },
                                {
                                    kind: sourcegraph.MarkupKind.Markdown,
                                    value: '<br/><br/>\n' + data.body,
                                },
                            ],
                        }
                        return view
                    })
                )
            },
        })
    )
}
