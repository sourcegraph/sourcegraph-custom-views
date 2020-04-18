import { Observable, of } from 'rxjs'

export interface Data {
    title: string
    summary: string
    githubOrgs: string[]
    body: string
}

export const getData = (name: string): Observable<Data> => {
    return of<Data>({
        title: 'Acme Corp open-source code search',
        summary: 'Instant code search across all Acme Corp open-source code.',
        githubOrgs: ['sourcegraph'],
        body: `Hello, world!`,
    })
}
